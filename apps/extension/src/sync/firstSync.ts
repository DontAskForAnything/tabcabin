import { ENTITY_TYPES } from '@tabcabin/core'
import { db } from '@/db/db'
import type { SyncClient } from './client'
import { pullAll } from './pull'
import { pushAll } from './push'
import { entityTables, table } from './rows'
import { updateSyncState } from './state'

export type FirstSyncMode = 'merge' | 'server'

/** Queues every local row, so a first sync uploads what this browser already has. */
async function enqueueEverything() {
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
async function clearLocalData() {
  await db.transaction('rw', [...entityTables(), db.outbox], async () => {
    await Promise.all([...entityTables(), db.outbox].map((t) => t.clear()))
  })
}

/** Whether this browser has boards of its own (the first sync then asks what to keep). */
export async function localHasData(): Promise<boolean> {
  return (await db.workspaces.filter((ws) => ws.deletedAt === null).count()) > 0
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
