import { createApp } from '../src/app'
import { loadConfig } from '../src/config'
import { openDatabase } from '../src/db/client'
import { migrationsFolder } from '../src/paths'

/** A fresh app on an in-memory database. */
export function testApp(env: Record<string, string> = {}, now?: () => number) {
  const config = loadConfig({ DATA_DIR: '/tmp/unused', ...env })
  const { db, sqlite } = openDatabase(':memory:', migrationsFolder())
  const app = createApp({ db, config, now })
  return { app, db, sqlite, config }
}
