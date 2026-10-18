import { type SignOutOptions, type SignOutResult, signOut } from '@/sync/signOut'
import { syncEngine } from './sync'

/** Signs out for a page; after removing this browser's data, every open page starts over. */
export async function handleSignOut(options: SignOutOptions): Promise<SignOutResult> {
  const result = await signOut(syncEngine, options)
  if (result.ok && options.remove)
    await browser.runtime.sendMessage({ type: 'tabcabin:reset' }).catch(() => undefined)
  return result
}
