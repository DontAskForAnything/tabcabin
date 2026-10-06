import { Dexie } from 'dexie'

/** The database name from before the app was called TabCabin. */
export const LEGACY_NAME = 'tabhangar'

const MOVED = 'movedFrom'

/**
 * Moves everything from the old database into `db` once: copy all rows, then delete the old
 * database. Runs while `db` opens (see db.ts), so every page and the background see the boards,
 * settings, pending sync changes and the signed-in account from the first query on.
 *
 * Nothing is copied when `db` already has workspaces; the old database is then left alone.
 */
export async function moveLegacyDatabase(db: Dexie, legacyName = LEGACY_NAME): Promise<boolean> {
  if (!(await Dexie.exists(legacyName))) return false

  const legacy = new Dexie(legacyName)
  let rows: Array<[table: string, rows: unknown[]]>
  try {
    await legacy.open()
    const names = new Set(db.tables.map((table) => table.name))
    rows = await Promise.all(
      legacy.tables
        .filter((table) => names.has(table.name))
        .map(async (table) => [table.name, await table.toArray()] as [string, unknown[]]),
    )
  } finally {
    legacy.close()
  }

  // Two pages can open at the same time; the transaction lets only the first one copy.
  const moved = await db.transaction('rw', db.tables, async () => {
    if (await db.table('meta').get(MOVED)) return false
    if ((await db.table('workspaces').count()) > 0) return false
    for (const [table, list] of rows) await db.table(table).bulkPut(list)
    await db.table('meta').put({ key: MOVED, value: legacyName })
    return true
  })
  if (moved) await Dexie.delete(legacyName)
  return moved
}
