import { Hono } from 'hono'
import { bodyLimit } from 'hono/body-limit'
import { streamSSE } from 'hono/streaming'
import { z } from 'zod'
import { requireAuth } from '../auth/middleware'
import type { Config } from '../config'
import type { Db } from '../db/client'
import type { AppEnv } from '../env'
import {
  applyPush,
  type ChangeFeed,
  currentSeq,
  InvalidChange,
  pullChanges,
  pushSchema,
} from '../sync'

const pullQuery = z.object({
  since: z.coerce.number().int().min(0).default(0),
  limit: z.coerce.number().int().min(1).max(1000).default(500),
})

export function syncRoutes(db: Db, config: Config, feed: ChangeFeed, now: () => number) {
  const routes = new Hono<AppEnv>()
  const auth = requireAuth(db, config, now)

  routes.post('/sync/push', auth, bodyLimit({ maxSize: 10 * 1024 * 1024 }), async (c) => {
    const body = pushSchema.safeParse(await c.req.json().catch(() => null))
    if (!body.success) return c.json({ error: 'invalid_request', issues: body.error.issues }, 400)
    try {
      const user = c.get('user')
      const result = applyPush(db, user.id, body.data, now())
      if (result.accepted > 0) feed.publish(user.id, result.seq)
      return c.json(result)
    } catch (error) {
      if (error instanceof InvalidChange)
        return c.json({ error: 'invalid_change', index: error.index, message: error.message }, 400)
      throw error
    }
  })

  routes.get('/sync/pull', auth, (c) => {
    const query = pullQuery.safeParse(c.req.query())
    if (!query.success) return c.json({ error: 'invalid_request' }, 400)
    return c.json(pullChanges(db, c.get('user').id, query.data.since, query.data.limit))
  })

  /** Server-sent events: `seq` whenever this user's data changes, plus a heartbeat. */
  routes.get('/events', auth, (c) => {
    const userId = c.get('user').id
    return streamSSE(c, async (stream) => {
      let wake: (() => void) | null = null
      let latest: number | null = null
      const unsubscribe = feed.subscribe(userId, (seq) => {
        latest = seq
        wake?.()
      })
      stream.onAbort(unsubscribe)
      await stream.writeSSE({ event: 'hello', data: JSON.stringify({ seq: currentSeq(db) }) })
      while (!stream.aborted) {
        await new Promise<void>((resolve) => {
          wake = resolve
          setTimeout(resolve, 25_000)
        })
        wake = null
        if (stream.aborted) break
        if (latest !== null) {
          await stream.writeSSE({ event: 'change', data: JSON.stringify({ seq: latest }) })
          latest = null
        } else {
          await stream.writeSSE({ event: 'ping', data: '' })
        }
      }
      unsubscribe()
    })
  })

  return routes
}
