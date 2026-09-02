import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

/** The `drizzle/` folder next to the bundle (dist) or the package root (dev, tests). */
export function migrationsFolder(): string {
  const here = dirname(fileURLToPath(import.meta.url))
  const candidates = [resolve(here, 'drizzle'), resolve(here, '../drizzle')]
  const found = candidates.find((dir) => existsSync(resolve(dir, 'meta/_journal.json')))
  if (!found) throw new Error(`Migrations not found in ${candidates.join(' or ')}`)
  return found
}
