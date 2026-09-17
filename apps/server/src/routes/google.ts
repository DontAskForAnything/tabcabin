import { createHash, randomBytes } from 'node:crypto'
import { Hono } from 'hono'
import { z } from 'zod'
import { RateLimiter } from '../auth/rateLimit'
import { hashToken } from '../auth/tokens'
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
 *
 * Pending sign-ins live in memory for a few minutes; a restart only means "try again".
 */

const PENDING_MS = 10 * 60_000
const CODE_MS = 2 * 60_000
const MAX_PENDING = 1000

const base64url = (bytes: Buffer) => bytes.toString('base64url')
const challengeOf = (verifier: string) => base64url(createHash('sha256').update(verifier).digest())

interface Pending {
  redirectUri: string
  challenge: string
  label: string
  googleVerifier: string
  expiresAt: number
}

interface Grant {
  userId: string
  challenge: string
  label: string
  expiresAt: number
}

/** Extension redirect addresses (Chromium browsers and Firefox), optionally limited by id. */
function extensionRedirect(value: string, config: Config): string | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  const match = /^([a-z0-9-]+)\.(chromiumapp\.org|extensions\.allizom\.org)$/i.exec(url.hostname)
  if (url.protocol !== 'https:' || !match || url.username || url.port) return null
  if (config.extensionIds.length > 0 && !config.extensionIds.includes(match[1]!.toLowerCase()))
    return null
  return url.toString()
}

function withParams(address: string, params: Record<string, string>): string {
  const url = new URL(address)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}

const tokenResponse = z.object({ id_token: z.string() })
const claimsSchema = z.object({
  iss: z.string(),
  aud: z.union([z.string(), z.array(z.string())]),
  exp: z.number(),
  sub: z.string().min(1),
  email: z.string().optional(),
  email_verified: z.union([z.boolean(), z.literal('true'), z.literal('false')]).optional(),
})

/** Claims of an ID token received directly from Google over TLS (OIDC Core 3.1.3.7). */
function readIdToken(idToken: string, config: NonNullable<Config['google']>, nowMs: number) {
  const payload = idToken.split('.')[1]
  if (!payload) return null
  let claims: z.infer<typeof claimsSchema>
  try {
    claims = claimsSchema.parse(JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')))
  } catch {
    return null
  }
  const audiences = Array.isArray(claims.aud) ? claims.aud : [claims.aud]
  if (!audiences.includes(config.clientId)) return null
  if (config.issuers.length > 0 && !config.issuers.includes(claims.iss)) return null
  if (claims.exp * 1000 < nowMs) return null
  return {
    sub: claims.sub,
    email: claims.email ?? '',
    emailVerified: claims.email_verified === true || claims.email_verified === 'true',
  }
}

const page = (title: string, text: string) =>
  `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>${title}</title><body style="font:16px/1.5 system-ui,sans-serif;max-width:420px;margin:15vh auto;padding:0 24px;color:#1c1d22"><h1 style="font-size:20px">${title}</h1><p>${text}</p></body>`

export function googleRoutes(db: Db, config: Config, now: () => number, fetcher: typeof fetch) {
  const routes = new Hono<AppEnv>()
  const pending = new Map<string, Pending>()
  const grants = new Map<string, Grant>()
  const byIp = new RateLimiter(30, 15 * 60_000)
  const google = config.google

  const sweep = () => {
    const t = now()
    for (const [key, entry] of pending) if (entry.expiresAt < t) pending.delete(key)
    for (const [key, entry] of grants) if (entry.expiresAt < t) grants.delete(key)
  }

  routes.use('*', async (c, next) => {
    if (!google) return c.json({ error: 'google_disabled' }, 404)
    await next()
  })

  routes.get('/start', (c) => {
    const ip = clientIp(c, config)
    const wait = byIp.retryAfter(ip, now())
    if (wait > 0) return c.text('Too many sign-in attempts, try again later.', 429)
    byIp.hit(ip, now())
    sweep()
    const redirectUri = extensionRedirect(c.req.query('redirect_uri') ?? '', config)
    const challenge = c.req.query('code_challenge') ?? ''
    if (!redirectUri || !/^[A-Za-z0-9_-]{43}$/.test(challenge))
      return c.html(page('Sign-in failed', 'This sign-in request is not valid.'), 400)
    if (pending.size >= MAX_PENDING)
      return c.html(page('Sign-in failed', 'Too many sign-ins in progress, try again soon.'), 503)

    const state = base64url(randomBytes(24))
    const googleVerifier = base64url(randomBytes(32))
    pending.set(state, {
      redirectUri,
      challenge,
      label: (c.req.query('label') ?? '').slice(0, 120),
      googleVerifier,
      expiresAt: now() + PENDING_MS,
    })
    return c.redirect(
      withParams(google!.authUrl, {
        client_id: google!.clientId,
        redirect_uri: `${config.publicUrl}/auth/google/callback`,
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
    const state = c.req.query('state') ?? ''
    const entry = pending.get(state)
    pending.delete(state)
    if (!entry || entry.expiresAt < now())
      return c.html(
        page('Sign-in expired', 'Close this window and choose “Continue with Google” again.'),
        400,
      )
    const back = (params: Record<string, string>) =>
      c.redirect(withParams(entry.redirectUri, params))
    const code = c.req.query('code')
    if (!code)
      return back({
        error: c.req.query('error') === 'access_denied' ? 'cancelled' : 'google_failed',
      })

    let claims: ReturnType<typeof readIdToken> = null
    try {
      const response = await fetcher(google!.tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code,
          client_id: google!.clientId,
          client_secret: google!.clientSecret,
          redirect_uri: `${config.publicUrl}/auth/google/callback`,
          grant_type: 'authorization_code',
          code_verifier: entry.googleVerifier,
        }),
      })
      const body = tokenResponse.safeParse(await response.json().catch(() => null))
      if (response.ok && body.success) claims = readIdToken(body.data.id_token, google!, now())
    } catch (error) {
      console.error('Google token request failed:', error)
    }
    if (!claims) return back({ error: 'google_failed' })

    const result = signInWithGoogle(db, claims, config, now())
    if ('error' in result) return back({ error: result.error })
    const grant = base64url(randomBytes(32))
    grants.set(hashToken(grant), {
      userId: result.user.id,
      challenge: entry.challenge,
      label: entry.label,
      expiresAt: now() + CODE_MS,
    })
    return back({ code: grant })
  })

  routes.post('/exchange', async (c) => {
    const body = z
      .object({ code: z.string().max(100), verifier: z.string().min(43).max(128) })
      .safeParse(await c.req.json().catch(() => null))
    if (!body.success) return c.json({ error: 'invalid_request' }, 400)
    const key = hashToken(body.data.code)
    const grant = grants.get(key)
    grants.delete(key)
    if (!grant || grant.expiresAt < now() || challengeOf(body.data.verifier) !== grant.challenge)
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
