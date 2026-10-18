import type { SignOutOptions, SignOutResult } from '@/sync/signOut'
import { SIGNED_OUT_NOTE } from '../../StartOver'

/**
 * Asks the background to sign out. After removing this browser's data the page reloads (the
 * background tells every open page to) and says so once it is back.
 */
export async function requestSignOut(options: SignOutOptions): Promise<SignOutResult> {
  if (options.remove) sessionStorage.setItem(SIGNED_OUT_NOTE, '1')
  const result = (await browser.runtime
    .sendMessage({ type: 'tabcabin:sign-out', ...options })
    .catch(() => undefined)) as SignOutResult | undefined
  if (!result?.ok) {
    sessionStorage.removeItem(SIGNED_OUT_NOTE)
    return result ?? { ok: false, pending: 0 }
  }
  if (options.remove) location.reload()
  return result
}
