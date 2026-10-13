import { db } from '../db'
import { ONBOARDING_KEY } from '../onboarding'

/**
 * Removes everything stored in this browser except the theme, the language and the welcome dialog
 * (someone who deletes their data is not new here).
 */
export async function clearAllData() {
  await db.transaction('rw', db.tables, async () => {
    const keep = await db.settings.bulkGet(['theme', 'locale'])
    const onboarding = await db.meta.get(ONBOARDING_KEY)
    await Promise.all(db.tables.map((table) => table.clear()))
    await db.settings.bulkPut(keep.filter((row) => row !== undefined))
    if (onboarding) await db.meta.put(onboarding)
  })
}
