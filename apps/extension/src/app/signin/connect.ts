import { useEffect, useState } from 'react'
import type { Translate } from '@/i18n'
import { extensionUrl } from '@/lib/browser'
import { ApiError, type SignedIn, SyncClient } from '@/sync/client'
import { firstSync, localHasData } from '@/sync/engine'
import { type Account, setAccount } from '@/sync/state'

export function deviceLabel(): string {
  const platform =
    (navigator as Navigator & { userAgentData?: { platform?: string } }).userAgentData?.platform ||
    navigator.platform ||
    'browser'
  return `TabHangar · ${platform}`
}

export function errorText(error: unknown, t: Translate): string {
  if (!(error instanceof ApiError)) return t('sync.error.generic', { code: String(error) })
  switch (error.code) {
    case 'invalid_credentials':
    case 'signup_disabled':
    case 'username_taken':
    case 'invalid_request':
    case 'network':
    case 'not_invited':
    case 'email_not_verified':
    case 'google_failed':
    case 'invalid_code':
    case 'permission':
    case 'too_many_signups':
    case 'server_full':
      return t(`sync.error.${error.code}`)
    case 'too_many_attempts':
      return t('sync.error.too_many_attempts', { seconds: error.retryAfter ?? 60 })
    default:
      return t('sync.error.generic', { code: error.code })
  }
}

export type Health =
  | { state: 'checking' | 'down' }
  | { state: 'ok'; version: string; google: boolean; signup: boolean }

/** Whether the sync server answers, and which sign-in options it offers. */
export function useServerHealth(serverUrl: string | null | undefined): Health {
  const [health, setHealth] = useState<Health>({ state: 'checking' })
  useEffect(() => {
    if (!serverUrl) return
    let cancelled = false
    setHealth({ state: 'checking' })
    new SyncClient(serverUrl)
      .health()
      .then((res) => {
        if (cancelled) return
        setHealth(
          res.name === 'tabhangar'
            ? {
                state: 'ok',
                version: res.version,
                google: res.auth?.google ?? false,
                // Older servers don't say; keep offering signup there.
                signup: res.auth?.signup ?? true,
              }
            : { state: 'down' },
        )
      })
      .catch(() => !cancelled && setHealth({ state: 'down' }))
    return () => {
      cancelled = true
    }
  }, [serverUrl])
  return health
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

/** Opens the sign-in page: in this tab on the new tab page, in a new tab elsewhere. */
export function openSignInPage(sameTab: boolean) {
  const url = extensionUrl('/signin.html')
  if (sameTab) location.assign(url)
  else void browser.tabs.create({ url })
}

export function openBoards() {
  location.assign(extensionUrl('/newtab.html'))
}
