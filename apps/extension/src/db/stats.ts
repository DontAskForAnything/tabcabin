import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

/** Tabs TabCabin closed for the user, per local day (this browser only, never synced). */
const CLOSED_TABS_KEY = 'stats.closedTabs'
type Days = Record<string, number>

const DAY = 24 * 60 * 60 * 1000
const KEEP_DAYS = 56

/** "2026-10-13" in local time. */
export function dayKey(time: number): string {
  const date = new Date(time)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export async function countClosedTabs(count: number, now = Date.now()) {
  if (count <= 0) return
  await db.transaction('rw', db.meta, async () => {
    const days = { ...((await db.meta.get(CLOSED_TABS_KEY))?.value as Days | undefined) }
    const today = dayKey(now)
    days[today] = (days[today] ?? 0) + count
    const oldest = dayKey(now - KEEP_DAYS * DAY)
    for (const day of Object.keys(days)) if (day < oldest) delete days[day]
    await db.meta.put({ key: CLOSED_TABS_KEY, value: days })
  })
}

export interface WeekStats {
  closedTabs: number
  savedLinks: number
  doneTasks: number
}

/**
 * The last seven days, today included: tabs TabCabin closed, links saved and to-dos ticked off.
 * The links of the starter board don't count.
 */
export async function loadWeek(now = Date.now()): Promise<WeekStats> {
  const firstDay = dayKey(now - 6 * DAY)
  const since = new Date(`${firstDay}T00:00:00`).getTime()
  const [closed, seeded, items] = await Promise.all([
    db.meta.get(CLOSED_TABS_KEY),
    db.meta.get('seeded'),
    db.items.toArray(),
  ])
  const days = (closed?.value as Days | undefined) ?? {}
  let savedLinks = 0
  let doneTasks = 0
  const starter = (time: number) => time === seeded?.value
  for (const item of items) {
    if (item.kind === 'link' && item.createdAt >= since && !starter(item.createdAt)) savedLinks++
    if (item.todo && item.done && item.updatedAt >= since && !starter(item.updatedAt)) doneTasks++
  }
  const closedTabs = Object.entries(days)
    .filter(([day]) => day >= firstDay)
    .reduce((sum, [, count]) => sum + count, 0)
  return { closedTabs, savedLinks, doneTasks }
}

export function useWeekStats(): WeekStats | undefined {
  return useLiveQuery(() => loadWeek(), [])
}
