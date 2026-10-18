import { db } from '@/db/db'
import { clearAllData } from '@/db/repo'
import { SyncClient } from './client'
import type { SyncEngine } from './engine'
import { getAccount, INITIAL_STATE, setAccount, updateSyncState } from './state'

export interface SignOutOptions {
  /** Remove everything TabCabin stored in this browser (a borrowed or shared computer). */
  remove: boolean
  /** Remove even when some changes could not reach the account. */
  force: boolean
}

export type SignOutResult = { ok: true } | { ok: false; pending: number }

/** How long the last changes may take to upload before we ask what to do. */
const UPLOAD_WAIT = 10_000

/**
 * Signs this browser out. Before removing its data, the changes still waiting are sent to the
 * account; when that fails, nothing happens and the number of waiting changes comes back.
 * Syncing stops (a download still running is waited for) before anything is removed, so no
 * rows come back afterwards. The account on the server is never touched.
 */
export async function signOut(
  engine: SyncEngine,
  { remove, force }: SignOutOptions,
  fetchImpl?: typeof fetch,
): Promise<SignOutResult> {
  const account = await getAccount()
  if (remove && !force && account?.token && account.initialized) {
    await engine.setAccount(account)
    let timer: ReturnType<typeof setTimeout> | undefined
    const waited = new Promise((resolve) => (timer = setTimeout(resolve, UPLOAD_WAIT)))
    await Promise.race([engine.syncNow(), waited])
    clearTimeout(timer)
    const pending = await db.outbox.count()
    if (pending > 0) return { ok: false, pending }
  }

  await setAccount(null)
  await engine.halt()
  if (account?.token)
    await new SyncClient(account.serverUrl, account.token, fetchImpl)
      .logout()
      .catch(() => undefined)
  if (remove) await clearAllData({ fresh: true })
  else await updateSyncState(INITIAL_STATE)
  return { ok: true }
}
