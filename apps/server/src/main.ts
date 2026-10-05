import { serve } from '@hono/node-server'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { createApp } from './app'
import { loadConfig } from './config'
import { openDatabase } from './db/client'
import { migrationsFolder } from './paths'
import { ensureAdmin } from './users'

const config = loadConfig()
mkdirSync(config.dataDir, { recursive: true })
const { db, sqlite } = openDatabase(join(config.dataDir, 'tabhangar.db'), migrationsFolder())
const admin = await ensureAdmin(db, config.admin)
if (admin) console.log(`Created the first account: ${admin.username}`)
const app = createApp({ db, config })

const server = serve({ fetch: app.fetch, port: config.port, hostname: config.host }, (info) => {
  console.log(`TabCabin server listening on http://${info.address}:${info.port}`)
})

function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`)
  server.close(() => {
    sqlite.close()
    process.exit(0)
  })
  setTimeout(() => process.exit(1), 10_000).unref()
}
process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))
