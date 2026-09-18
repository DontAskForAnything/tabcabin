import { ApiError, type SignedIn, type SyncClient } from './client'

const base64url = (bytes: ArrayBuffer | Uint8Array) =>
  btoa(String.fromCharCode(...new Uint8Array(bytes)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

/**
 * Asks for the `identity` permission. Call it first thing in a click handler: the browser only
 * shows its prompt during a user gesture.
 */
export function requestIdentityPermission(): Promise<boolean> {
  return browser.permissions.request({ permissions: ['identity'] }).catch(() => false)
}

/**
 * Signs in to the server with Google: the server runs the Google part in a browser sign-in
 * window and hands back a one-time code that only this extension can redeem (PKCE).
 */
export async function signInWithGoogle(client: SyncClient, label: string): Promise<SignedIn> {
  const verifier = base64url(crypto.getRandomValues(new Uint8Array(32)))
  const challenge = base64url(
    await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)),
  )
  const redirect = browser.identity.getRedirectURL('google')
  let finalUrl: string | undefined
  try {
    finalUrl = await browser.identity.launchWebAuthFlow({
      url: client.googleStartUrl(redirect, challenge, label),
      interactive: true,
    })
  } catch {
    // The window was closed, or the server could not be reached.
    throw new ApiError(0, 'cancelled')
  }
  const result = finalUrl ? new URL(finalUrl).searchParams : new URLSearchParams()
  const code = result.get('code')
  if (!code) throw new ApiError(0, result.get('error') ?? 'google_failed')
  return client.exchangeGoogleCode(code, verifier)
}
