import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'

export interface Account {
  serverUrl: string
  token: string
  user: { id: string; username: string; isAdmin: boolean }
  /** Set once the first synchronization (merge or download) finished. */
  initialized: boolean
}

export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'offline' | 'error' | 'signed-out'

export interface SyncState {
  status: SyncStatus
  lastSeq: number
  lastSyncAt: number | null
  error: string | null
  /** Live updates from the server are connected. */
  live: boolean
}

export const INITIAL_STATE: SyncState = {
  status: 'idle',
  lastSeq: 0,
  lastSyncAt: null,
  error: null,
  live: false,
}

const ACCOUNT = 'sync.account'
const STATE = 'sync.state'

export async function getAccount(): Promise<Account | null> {
  return ((await db.meta.get(ACCOUNT))?.value as Account | undefined) ?? null
}

export async function setAccount(account: Account | null) {
  if (account) await db.meta.put({ key: ACCOUNT, value: account })
  else await db.meta.delete(ACCOUNT)
}

export async function getSyncState(): Promise<SyncState> {
  return { ...INITIAL_STATE, ...((await db.meta.get(STATE))?.value as Partial<SyncState>) }
}

export async function updateSyncState(patch: Partial<SyncState>) {
  await db.transaction('rw', db.meta, async () => {
    const current = await getSyncState()
    await db.meta.put({ key: STATE, value: { ...current, ...patch } })
  })
}

export function useAccount(): Account | null | undefined {
  return useLiveQuery(getAccount, [])
}

export function useSyncState(): SyncState | undefined {
  return useLiveQuery(getSyncState, [])
}

export function usePendingCount(): number {
  return useLiveQuery(() => db.outbox.count(), []) ?? 0
}

/** "https://tabs.example.com/" → "https://tabs.example.com"; adds https:// when missing. */
export function normalizeServerUrl(input: string): string | null {
  const text = input.trim()
  if (!text) return null
  try {
    const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`)
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
    return `${url.origin}${url.pathname.replace(/\/+$/, '')}`
  } catch {
    return null
  }
}
