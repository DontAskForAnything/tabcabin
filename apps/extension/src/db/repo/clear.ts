import { db } from '../db'

/** Removes everything stored in this browser except the theme and language. */
export async function clearAllData() {
  await db.transaction('rw', db.tables, async () => {
    const keep = await db.settings.bulkGet(['theme', 'locale'])
    await Promise.all(db.tables.map((table) => table.clear()))
    await db.settings.bulkPut(keep.filter((row) => row !== undefined))
  })
}
