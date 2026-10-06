import { existsSync, renameSync } from 'node:fs'
import { join } from 'node:path'

const FILE = 'tabcabin.db'
/** The database file name from before the app was called TabCabin. */
const LEGACY_FILE = 'tabhangar.db'

/**
 * Path of the SQLite database in `dataDir`. A database from before the rename is moved to the new
 * name first, together with its write-ahead log (the main file last, so an interrupted move simply
 * continues on the next start).
 */
export function databaseFile(dataDir: string): string {
  const file = join(dataDir, FILE)
  const legacy = join(dataDir, LEGACY_FILE)
  if (!existsSync(file) && existsSync(legacy)) {
    for (const suffix of ['-wal', '-shm', '']) {
      if (existsSync(legacy + suffix)) renameSync(legacy + suffix, file + suffix)
    }
  }
  return file
}
