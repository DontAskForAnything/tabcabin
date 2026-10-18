import { Hono } from 'hono'
import { z } from 'zod'
import { RateLimiter } from '../auth/rateLimit'
import type { Config } from '../config'
import { sendToDiscord } from '../feedback/discord'
import { clientIp } from './clientIp'

const DAY = 86_400_000
/** Longest message the form takes (Discord shows up to 4096 characters in one embed). */
const MAX_FEEDBACK = 2000
/** Messages the whole server passes on per day, so a flood can't bury the channel. */
const MAX_FEEDBACK_PER_DAY = 200

const feedbackSchema = z.object({
  text: z.string().trim().min(1).max(MAX_FEEDBACK),
  email: z.union([z.email().max(254), z.literal('')]).optional(),
  version: z.string().regex(/^\d[\w.+-]{0,31}$/),
  language: z.string().regex(/^[a-z]{2}(-[A-Za-z]{2,4})?$/),
})

/**
 * The extension's feedback form, passed on to the owner's Discord channel. No account needed;
 * the webhook address stays on the server, and each network may send only a few a day.
 */
export function feedbackRoutes(config: Config, now: () => number, fetcher: typeof fetch) {
  const routes = new Hono()
  const byIp = new RateLimiter(config.feedbackPerIpPerDay, DAY)
  const overall = new RateLimiter(MAX_FEEDBACK_PER_DAY, DAY)

  routes.post('/feedback', async (c) => {
    if (!config.feedbackWebhook) return c.json({ error: 'feedback_off' }, 404)
    const body = feedbackSchema.safeParse(await c.req.json().catch(() => null))
    if (!body.success) return c.json({ error: 'invalid_request' }, 400)
    const ip = clientIp(c, config)
    const wait = Math.max(byIp.retryAfter(ip, now()), overall.retryAfter('all', now()))
    if (wait > 0) return c.json({ error: 'too_many_messages', retryAfter: wait }, 429)
    byIp.hit(ip, now())
    overall.hit('all', now())
    const { email, ...rest } = body.data
    const sent = await sendToDiscord(
      config.feedbackWebhook,
      { ...rest, ...(email ? { email } : {}) },
      now(),
      fetcher,
    )
    return sent ? c.body(null, 204) : c.json({ error: 'feedback_failed' }, 502)
  })

  return routes
}
