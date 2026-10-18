import { db } from '../db'
import { DAY, dayKey } from './days'
import { ownDeviceId } from './device'

export interface WeekStats {
  closedTabs: number
  savedLinks: number
  doneTasks: number
}

/**
 * The last seven days, today included. `everywhere` adds up every computer of the account;
 * otherwise only this browser counts.
 */
export async function loadWeek(now = Date.now(), everywhere = false): Promise<WeekStats> {
  const firstDay = dayKey(now - 6 * DAY)
  const own = await ownDeviceId()
  const rows = everywhere
    ? await db.activity.filter((row) => row.deletedAt === null).toArray()
    : own
      ? [await db.activity.get(own)].filter((row) => row !== undefined)
      : []
  const week = { closedTabs: 0, savedLinks: 0, doneTasks: 0 }
  for (const row of rows)
    for (const [day, counts] of Object.entries(row.days)) {
      if (day < firstDay) continue
      week.closedTabs += counts.closed
      week.savedLinks += counts.saved
      week.doneTasks += counts.done
    }
  return week
}
