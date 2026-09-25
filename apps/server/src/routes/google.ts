import { Hono } from 'hono'
import { z } from 'zod'
import { exchangeCode } from '../auth/google/googleTokens'
import { messagePage } from '../auth/google/messagePage'
import { CHALLENGE_PATTERN, challengeOf, randomSecret } from '../auth/google/pkce'
import { extensionRedirect, withParams } from '../auth/google/redirect'
import { SignInStore } from '../auth/google/SignInStore'
import { RateLimiter } from '../auth/rateLimit'
import type { SignupGuard } from '../auth/signupGuard'
import type { Config } from '../config'
import type { Db } from '../db/client'
import type { AppEnv } from '../env'
import { createSession, getUser, signInWithGoogle } from '../users'
import { clientIp } from './clientIp'

/*
 * "Sign in with Google" for the extension (OAuth 2.0 authorization code flow with PKCE; the
 * client secret stays on the server):
 *
 * 1. The extension opens /auth/google/start in a sign-in window (`launchWebAuthFlow`) with its
 *    redirect address and the hash of a secret it keeps (`code_challenge`).
 * 2. The server sends the window to Google; Google returns to /auth/google/callback.
 * 3. The server reads the ID token straight from Google's token endpoint, finds or creates the
 *    user and sends the window back to the extension with a one-time code.
 * 4. The extension trades the code plus its secret for a normal session at /auth/google/exchange.
 */
export function googleRoutes(
  db: Db,
  config: Config,
  now: () => number,
  fetcher: typeof fetch,
  signups: SignupGuard,
) {
  const routes = new Hono<AppEnv>()
  const store = new SignInStore(now)
  const byIp = new RateLimiter(30, 15 * 60_000)
  const google = config.google
  const callbackUrl = `${config.publicUrl}/auth/google/callback`

  routes.use('*', async (c, next) => {
    if (!google) return c.json({ error: 'google_disabled' }, 404)
    await next()
  })

  routes.get('/start', (c) => {
    const ip = clientIp(c, config)
    if (byIp.retryAfter(ip, now()) > 0)
      return c.text('Too many sign-in attempts, try again later.', 429)
    byIp.hit(ip, now())
    const redirectUri = extensionRedirect(c.req.query('redirect_uri') ?? '', config)
    const challenge = c.req.query('code_challenge') ?? ''
    if (!redirectUri || !CHALLENGE_PATTERN.test(challenge))
      return c.html(messagePage('Sign-in failed', 'This sign-in request is not valid.'), 400)

    const state = randomSecret(24)
    const googleVerifier = randomSecret()
    const label = (c.req.query('label') ?? '').slice(0, 120)
    if (!store.addPending(state, { redirectUri, challenge, label, googleVerifier }))
      return c.html(
        messagePage('Sign-in failed', 'Too many sign-ins in progress, try again soon.'),
        503,
      )
    return c.redirect(
      withParams(google!.authUrl, {
        client_id: google!.clientId,
        redirect_uri: callbackUrl,
        response_type: 'code',
        scope: 'openid email profile',
        state,
        code_challenge: challengeOf(googleVerifier),
        code_challenge_method: 'S256',
        prompt: 'select_account',
      }),
    )
  })

  routes.get('/callback', async (c) => {
    const entry = store.takePending(c.req.query('state') ?? '')
    if (!entry)
      return c.html(
        messagePage(
          'Sign-in expired',
          'Close this window and choose “Continue with Google” again.',
        ),
        400,
      )
    const back = (params: Record<string, string>) =>
      c.redirect(withParams(entry.redirectUri, params))
    const code = c.req.query('code')
    if (!code)
      return back({
        error: c.req.query('error') === 'access_denied' ? 'cancelled' : 'google_failed',
      })

    const claims = await exchangeCode(
      fetcher,
      google!,
      { code, verifier: entry.googleVerifier, redirectUri: callbackUrl },
      now(),
    )
    if (!claims) return back({ error: 'google_failed' })

    const ip = clientIp(c, config)
    const result = signInWithGoogle(db, claims, config, now(), signups.blocked(ip, now()))
    if ('error' in result) return back({ error: result.error })
    if (result.created) signups.created(ip, now())
    const grant = randomSecret()
    store.addGrant(grant, {
      userId: result.user.id,
      challenge: entry.challenge,
      label: entry.label,
    })
    return back({ code: grant })
  })

  routes.post('/exchange', async (c) => {
    const body = z
      .object({ code: z.string().max(100), verifier: z.string().min(43).max(128) })
      .safeParse(await c.req.json().catch(() => null))
    if (!body.success) return c.json({ error: 'invalid_request' }, 400)
    const grant = store.takeGrant(body.data.code)
    if (!grant || challengeOf(body.data.verifier) !== grant.challenge)
      return c.json({ error: 'invalid_code' }, 400)
    const user = getUser(db, grant.userId)
    if (!user) return c.json({ error: 'invalid_code' }, 400)
    const session = createSession(db, user.id, {
      ttlMs: config.sessionTtlMs,
      label: grant.label,
      now: now(),
    })
    return c.json({ user, ...session })
  })

  return routes
}
