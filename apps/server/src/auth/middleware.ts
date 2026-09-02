import { createMiddleware } from 'hono/factory'
import type { Config } from '../config'
import type { Db } from '../db/client'
import type { AppEnv } from '../env'
import { resolveSession } from '../users'

/** Requires `Authorization: Bearer <token>` with a live session. */
export function requireAuth(db: Db, config: Config, now: () => number) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const header = c.req.header('authorization') ?? ''
    const match = /^Bearer\s+(\S+)$/i.exec(header)
    const session = match
      ? resolveSession(db, match[1]!, { ttlMs: config.sessionTtlMs, now: now() })
      : null
    if (!session) return c.json({ error: 'unauthorized' }, 401)
    c.set('user', session.user)
    c.set('tokenHash', session.tokenHash)
    await next()
  })
}
