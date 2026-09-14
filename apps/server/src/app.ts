import { sql } from 'drizzle-orm'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import pkg from '../package.json' with { type: 'json' }
import type { Config } from './config'
import type { Db } from './db/client'
import { authRoutes } from './routes/auth'
import { syncRoutes } from './routes/sync'
import { ChangeFeed } from './sync'

export interface AppDeps {
  db: Db
  config: Config
  feed?: ChangeFeed
  /** Clock, replaceable in tests. */
  now?: () => number
}

/** Origins allowed to call the API: browser extensions and the server's own address. */
function allowedOrigin(origin: string, config: Config): string | null {
  if (/^(chrome|moz)-extension:\/\/[a-z0-9-]+$/i.test(origin)) return origin
  if (config.publicUrl && origin === config.publicUrl) return origin
  return null
}

export function createApp({ db, config, feed = new ChangeFeed(), now = Date.now }: AppDeps) {
  const app = new Hono()

  app.use('*', secureHeaders())
  app.use(
    '*',
    cors({
      origin: (origin) => allowedOrigin(origin, config),
      allowHeaders: ['Authorization', 'Content-Type'],
      allowMethods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
      maxAge: 600,
    }),
  )

  app.get('/health', (c) => {
    db.get(sql`select 1`)
    return c.json({ ok: true, name: 'tabhangar', version: pkg.version })
  })

  app.route('/auth', authRoutes(db, config, now))
  app.route('/', syncRoutes(db, config, feed, now))

  app.notFound((c) => c.json({ error: 'not_found' }, 404))
  app.onError((error, c) => {
    console.error(error)
    return c.json({ error: 'internal' }, 500)
  })

  return app
}

