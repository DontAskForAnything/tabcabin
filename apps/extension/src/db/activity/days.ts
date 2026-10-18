import type { ActivityDay } from '@tabcabin/core'

export const DAY = 24 * 60 * 60 * 1000
/** Eight weeks of days are kept; the week view needs seven. */
const KEEP_DAYS = 56

export type Counts = Pick<ActivityDay, 'closed' | 'saved' | 'done'>
const COUNTS = ['closed', 'saved', 'done'] as const

/** "2026-10-13" in local time. */
export function dayKey(time: number): string {
  const date = new Date(time)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** Adds `delta` to the day of `now` (never below zero) and drops days older than eight weeks. */
export function addToDay(
  days: Record<string, ActivityDay>,
  delta: Partial<Counts>,
  now: number,
): Record<string, ActivityDay> {
  const today = dayKey(now)
  const day: ActivityDay = { closed: 0, saved: 0, done: 0, ...days[today] }
  for (const key of COUNTS) day[key] = Math.max(0, day[key] + (delta[key] ?? 0))
  const oldest = dayKey(now - KEEP_DAYS * DAY)
  return Object.fromEntries(
    Object.entries({ ...days, [today]: day }).filter(([key]) => key >= oldest),
  )
}
