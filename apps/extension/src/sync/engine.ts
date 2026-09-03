import { entitySchemas, type EntityType, ENTITY_TYPES } from '@tabhangar/core'
import type { Table } from 'dexie'
import { db, type OutboxEntry, tables } from '@/db/db'
import { ApiError, type PushChange, type RemoteChange, SyncClient } from './client'
import { type Account, getAccount, getSyncState, setAccount, updateSyncState } from './state'

type Row = { id: string; updatedAt: number }

const table = (entity: EntityType) => tables[entity]() as unknown as Table<Row, string>
const entityTables = () => ENTITY_TYPES.map((entity) => tables[entity]())

/** The oldest queued local changes, with the current version of each row. */
export async function collectPush(
  limit = 500,
): Promise<{ entries: OutboxEntry[]; changes: PushChange[] }> {
  const entries = await db.outbox.orderBy('queuedAt').limit(limit).toArray()
  const changes: PushChange[] = []
  for (const entry of entries) {
    const row = entry.type === 'put' ? await table(entry.entity).get(entry.id) : undefined
    changes.push(
      row
        ? { type: 'put', entity: entry.entity, row }
        : { type: 'purge', entity: entry.entity, id: entry.id, at: entry.queuedAt },
    )
  }
  return { entries, changes }
}

/** Removes sent outbox entries unless the row changed again in the meantime. */
export async function acknowledge(entries: OutboxEntry[]) {
  await db.transaction('rw', db.outbox, async () => {
    for (const entry of entries) {
      const current = await db.outbox.get([entry.entity, entry.id])
      if (current && current.queuedAt === entry.queuedAt)
        await db.outbox.delete([entry.entity, entry.id])
    }
  })
}

/**
 * Writes rows that came from the server without queuing them again. A local row with a
 * pending, newer change is kept (it will be pushed and win on the server).
 */
export async function applyRemote(changes: RemoteChange[], seq: number) {
  await db.transaction('rw', [...entityTables(), db.outbox, db.meta], async () => {
    for (const change of changes) {
      const t = table(change.entity)
      const local = await t.get(change.id)
      const pending = await db.outbox.get([change.entity, change.id])
      if (pending && local && local.updatedAt > change.updatedAt) continue
      if (change.row === null) {
        await t.delete(change.id)
      } else {
        const parsed = entitySchemas[change.entity].safeParse(change.row)
        if (!parsed.success) continue
        await t.put(parsed.data as Row)
      }
      if (pending) await db.outbox.delete([change.entity, change.id])
    }
    const state = await getSyncState()
    await db.meta.put({
      key: 'sync.state',
      value: { ...state, lastSeq: Math.max(state.lastSeq, seq) },
    })
  })
}

/** Queues every local row, so a first sync uploads what this browser already has. */
export async function enqueueEverything() {
  const now = Date.now()
  await db.transaction('rw', [...entityTables(), db.outbox], async () => {
    for (const entity of ENTITY_TYPES) {
      const keys = (await table(entity).toCollection().primaryKeys()) as string[]
      await db.outbox.bulkPut(
        keys.map((id) => ({ entity, id, type: 'put' as const, queuedAt: now })),
      )
    }
  })
}

/** Drops local boards (keeps settings) before downloading the server's copy. */
export async function clearLocalData() {
  await db.transaction('rw', [...entityTables(), db.outbox], async () => {
    await Promise.all([...entityTables(), db.outbox].map((t) => t.clear()))
  })
}

export async function localHasData(): Promise<boolean> {
  return (await db.workspaces.filter((ws) => ws.deletedAt === null).count()) > 0
}

type FirstSyncMode = 'merge' | 'server'

/**
 * Pushes and pulls until both sides are up to date. One run at a time; a request that
 * arrives while running schedules one more run.
 */
export class SyncEngine {
  private client: SyncClient | null = null
  private running: Promise<void> | null = null
  private again = false
  private live: AbortController | null = null
  private backoff = 1000
  private pushTimer: ReturnType<typeof setTimeout> | null = null

  constructor(private readonly fetchImpl?: typeof fetch) {}

  get active() {
    return this.client !== null
  }

  /** Starts or stops syncing for the stored account. */
  async setAccount(account: Account | null) {
    const same =
      account && this.client?.serverUrl === account.serverUrl && this.token === account.token
    if (same) return
    this.stop()
    if (!account?.token || !account.initialized) return
    this.token = account.token
    this.client = new SyncClient(account.serverUrl, account.token, this.fetchImpl)
    await this.syncNow()
    this.startLive()
  }

  private token: string | null = null

  stop() {
    this.client = null
    this.token = null
    this.live?.abort()
    this.live = null
    if (this.pushTimer) clearTimeout(this.pushTimer)
  }

  /** Debounced push after local edits. */
  schedulePush(delay = 800) {
    if (!this.client) return
    if (this.pushTimer) clearTimeout(this.pushTimer)
    this.pushTimer = setTimeout(() => void this.syncNow(), delay)
  }

  syncNow(): Promise<void> {
    if (!this.client) return Promise.resolve()
    if (this.running) {
      this.again = true
      return this.running
    }
    this.running = (async () => {
      do {
        this.again = false
        await this.runOnce()
      } while (this.again && this.client)
    })().finally(() => {
      this.running = null
    })
    return this.running
  }

  private async runOnce() {
    const client = this.client
    if (!client) return
    await updateSyncState({ status: 'syncing' })
    try {
      await pushAll(client)
      await pullAll(client)
      await updateSyncState({ status: 'synced', lastSyncAt: Date.now(), error: null })
    } catch (error) {
      await this.fail(error)
    }
  }

  private async fail(error: unknown) {
    if (error instanceof ApiError && error.status === 401) {
      const account = await getAccount()
      if (account) await setAccount({ ...account, token: '' })
      this.stop()
      await updateSyncState({ status: 'signed-out', error: 'session_expired', live: false })
      return
    }
    const offline = error instanceof ApiError && error.status === 0
    await updateSyncState({
      status: offline ? 'offline' : 'error',
      error: error instanceof Error ? error.message : String(error),
    })
  }

  /** Listens to the server's change events and reconnects with backoff. */
  startLive() {
    const client = this.client
    if (!client || this.live) return
    const controller = new AbortController()
    this.live = controller
    const connect = async () => {
      while (!controller.signal.aborted && this.client === client) {
        try {
          await client.events((event, data) => {
            if (event === 'hello') {
              this.backoff = 1000
              void updateSyncState({ live: true })
            }
            if (event === 'hello' || event === 'change') {
              const seq = Number((JSON.parse(data || '{}') as { seq?: number }).seq ?? 0)
              void getSyncState().then((state) => {
                if (seq > state.lastSeq) void this.syncNow()
              })
            }
          }, controller.signal)
        } catch (error) {
          if (controller.signal.aborted) break
          if (error instanceof ApiError && error.status === 401) return this.fail(error)
        }
        await updateSyncState({ live: false })
        if (controller.signal.aborted) break
        await new Promise((resolve) => setTimeout(resolve, this.backoff))
        this.backoff = Math.min(this.backoff * 2, 60_000)
      }
    }
    void connect()
  }

  /** True while the live connection is open or being retried. */
  get listening() {
    return this.live !== null
  }
}

export async function pushAll(client: SyncClient) {
  for (;;) {
    const { entries, changes } = await collectPush()
    if (entries.length === 0) return
    await client.push(changes)
    await acknowledge(entries)
    if (entries.length < 500) return
  }
}

export async function pullAll(client: SyncClient) {
  for (;;) {
    const { lastSeq } = await getSyncState()
    const page = await client.pull(lastSeq)
    if (page.changes.length) await applyRemote(page.changes, page.seq)
    if (!page.more) return
  }
}

/**
 * First synchronization after signing in. `merge` uploads this browser's data and downloads
 * the server's; `server` replaces local data with the server's copy.
 */
export async function firstSync(client: SyncClient, mode: FirstSyncMode) {
  await updateSyncState({ status: 'syncing', lastSeq: 0, error: null })
  if (mode === 'server') await clearLocalData()
  else await enqueueEverything()
  await pushAll(client)
  await pullAll(client)
  await updateSyncState({ status: 'synced', lastSyncAt: Date.now() })
}
