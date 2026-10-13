import { Hono } from 'hono'
import { z } from 'zod'
import { requireAuth } from '../auth/middleware'
import type { Config } from '../config'
import type { Db } from '../db/client'
import type { AppEnv } from '../env'
import { gonePage, pageLanguage, sharedPage } from '../shares/page'
import {
  findShare,
  loadShared,
  MAX_SHARES_PER_USER,
  NotSynced,
  shareGroup,
  TooManyShares,
  unshare,
} from '../shares/store'

const groupId = z.string().min(1).max(64)

/** The page is plain HTML and CSS: no scripts, no outside requests, kept out of search engines. */
const PAGE_HEADERS = {
  'Content-Security-Policy':
    "default-src 'none'; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'",
  'X-Robots-Tag': 'noindex, nofollow',
  'Referrer-Policy': 'no-referrer',
  'Cache-Control': 'no-store',
}

export function shareRoutes(db: Db, config: Config, now: () => number) {
  const routes = new Hono<AppEnv>()
  const auth = requireAuth(db, config, now)
  const view = (share: { id: string; groupId: string }) => ({
    id: share.id,
    groupId: share.groupId,
  })

  routes.get('/shares', auth, (c) => {
    const id = groupId.safeParse(c.req.query('groupId'))
    if (!id.success) return c.json({ error: 'invalid_request' }, 400)
    const share = findShare(db, c.get('user').id, id.data)
    return c.json({ share: share ? view(share) : null })
  })

  routes.post('/shares', auth, async (c) => {
    const body = z.object({ groupId }).safeParse(await c.req.json().catch(() => null))
    if (!body.success) return c.json({ error: 'invalid_request' }, 400)
    try {
      return c.json({ share: view(shareGroup(db, c.get('user').id, body.data.groupId, now())) })
    } catch (error) {
      if (error instanceof NotSynced) return c.json({ error: 'not_synced' }, 409)
      if (error instanceof TooManyShares)
        return c.json({ error: 'too_many_shares', limit: MAX_SHARES_PER_USER }, 409)
      throw error
    }
  })

  routes.delete('/shares/:id', auth, (c) =>
    unshare(db, c.get('user').id, c.req.param('id'))
      ? c.body(null, 204)
      : c.json({ error: 'not_found' }, 404),
  )

  routes.get('/s/:id', (c) => {
    const lang = pageLanguage(c.req.header('accept-language'))
    const group = loadShared(db, c.req.param('id'))
    for (const [name, value] of Object.entries(PAGE_HEADERS)) c.header(name, value)
    return group ? c.html(sharedPage(group, lang)) : c.html(gonePage(lang), 404)
  })

  return routes
}
