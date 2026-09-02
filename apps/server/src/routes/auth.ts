import { getConnInfo } from '@hono/node-server/conninfo'
import { Hono, type Context } from 'hono'
import { z } from 'zod'
import { requireAuth } from '../auth/middleware'
import { RateLimiter } from '../auth/rateLimit'
import type { Config } from '../config'
import type { Db } from '../db/client'
import type { AppEnv } from '../env'
import {
  checkCredentials,
  createSession,
  createUser,
  passwordSchema,
  revokeSession,
  UserError,
  usernameSchema,
} from '../users'

const loginSchema = z.object({
  username: z.string().max(64),
  password: z.string().max(256),
  /** Shown in a future session list, e.g. "Chrome on laptop". */
  label: z.string().max(120).optional(),
})

function clientIp(c: Context, config: Config): string {
  if (config.trustProxy) {
    const forwarded = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    if (forwarded) return forwarded
  }
  try {
    return getConnInfo(c).remote.address ?? 'unknown'
  } catch {
    return 'unknown'
  }
}

export function authRoutes(db: Db, config: Config, now: () => number) {
  // Per address: 20 attempts per 15 minutes; per account: 8 failures per 15 minutes.
  const byIp = new RateLimiter(20, 15 * 60_000)
  const byUser = new RateLimiter(8, 15 * 60_000)
  const routes = new Hono<AppEnv>()

  const session = (userId: string, label?: string) =>
    createSession(db, userId, { ttlMs: config.sessionTtlMs, label, now: now() })

  routes.post('/login', async (c) => {
    const body = loginSchema.safeParse(await c.req.json().catch(() => null))
    if (!body.success) return c.json({ error: 'invalid_request' }, 400)
    const ip = clientIp(c, config)
    const userKey = body.data.username.trim().toLowerCase()
    const wait = Math.max(byIp.retryAfter(ip, now()), byUser.retryAfter(userKey, now()))
    if (wait > 0) {
      c.header('Retry-After', String(wait))
      return c.json({ error: 'too_many_attempts', retryAfter: wait }, 429)
    }
    byIp.hit(ip, now())
    const user = await checkCredentials(db, body.data.username, body.data.password)
    if (!user) {
      byUser.hit(userKey, now())
      return c.json({ error: 'invalid_credentials' }, 401)
    }
    byUser.reset(userKey)
    return c.json({ user, ...session(user.id, body.data.label) })
  })

  routes.post('/signup', async (c) => {
    if (!config.allowSignup) return c.json({ error: 'signup_disabled' }, 403)
    const body = z
      .object({
        username: usernameSchema,
        password: passwordSchema,
        label: z.string().max(120).optional(),
      })
      .safeParse(await c.req.json().catch(() => null))
    if (!body.success) return c.json({ error: 'invalid_request', issues: body.error.issues }, 400)
    const ip = clientIp(c, config)
    if (byIp.retryAfter(ip, now()) > 0) return c.json({ error: 'too_many_attempts' }, 429)
    byIp.hit(ip, now())
    try {
      const user = await createUser(db, body.data, now())
      return c.json({ user, ...session(user.id, body.data.label) }, 201)
    } catch (error) {
      if (error instanceof UserError && error.code === 'username_taken')
        return c.json({ error: 'username_taken' }, 409)
      throw error
    }
  })

  const auth = requireAuth(db, config, now)
  routes.get('/me', auth, (c) => c.json({ user: c.get('user') }))
  routes.post('/logout', auth, (c) => {
    revokeSession(db, c.get('tokenHash'))
    return c.body(null, 204)
  })

  return routes
}
