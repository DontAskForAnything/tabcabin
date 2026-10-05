import { type SignedIn, type SyncClient } from './client'
import { firstSync, localHasData } from './firstSync'
import { type Account, setAccount } from './state'

/** Names the session on the server, e.g. "TabCabin · Windows". */
export function deviceLabel(): string {
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    navigator.platform ||
    'browser'
  return `TabCabin · ${platform}`
}

export interface PendingChoice {
  client: SyncClient
  account: Account
}

/**
 * Stores a fresh sign-in and runs the first sync. When both this browser and the account
 * already have boards, returns the choice to ask about instead.
 */
export async function completeSignIn(
  client: SyncClient,
  result: SignedIn,
  previous: Account | null | undefined,
): Promise<PendingChoice | null> {
  const account: Account = {
    serverUrl: client.serverUrl,
    token: result.token,
    user: result.user,
    initialized: false,
  }
  const sameAccount =
    previous?.initialized &&
    previous.serverUrl === client.serverUrl &&
    previous.user.id === result.user.id
  if (sameAccount) {
    await setAccount({ ...account, initialized: true })
    return null
  }
  const [local, remote] = await Promise.all([localHasData(), client.pull(0, 1)])
  if (local && remote.changes.length > 0) return { client, account }
  await firstSync(client, remote.changes.length > 0 ? 'server' : 'merge')
  await setAccount({ ...account, initialized: true })
  return null
}
