import { ApiError, SyncClient } from './client'
import { pullAll } from './pull'
import { pushAll } from './push'
import { type Account, getAccount, getSyncState, setAccount, updateSyncState } from './state'

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

  /** Stops syncing and waits for a pass that is still running, so nothing arrives after it. */
  async halt() {
    const running = this.running
    this.stop()
    await running?.catch(() => undefined)
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
        if (controller.signal.aborted) break
        await updateSyncState({ live: false })
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
