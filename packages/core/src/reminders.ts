import type { Reminder } from './schema'

/** Rule part of a reminder; times are local to the device. */
export type ReminderRule = Pick<Reminder, 'repeat' | 'weekdays' | 'monthDay' | 'timeOfDay'>

export const DEFAULT_TIME_OF_DAY = 9 * 60
const HOUR = 3_600_000

export function minutesOfDay(ts: number): number {
  const date = new Date(ts)
  return date.getHours() * 60 + date.getMinutes()
}

/** 0 = Monday … 6 = Sunday. */
export function weekdayOf(ts: number | Date): number {
  return (new Date(ts).getDay() + 6) % 7
}

export function startOfDay(ts: number): number {
  const date = new Date(ts)
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
}

/** Local timestamp of `minutes` after midnight on the given calendar day (month may overflow). */
export function atTime(year: number, month: number, day: number, minutes: number): number {
  return new Date(year, month, day, Math.floor(minutes / 60), minutes % 60).getTime()
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate()
}

/**
 * Next occurrence of a repeating rule strictly after `after`.
 * Monthly days past the end of a short month fall on its last day.
 * Returns null for one-time reminders and rules without days.
 */
export function nextOccurrence(rule: ReminderRule, after: number): number | null {
  const start = new Date(after)
  if (rule.repeat === 'weekly') {
    if (rule.weekdays.length === 0) return null
    for (let offset = 0; offset <= 7; offset++) {
      const day = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset)
      if (!rule.weekdays.includes(weekdayOf(day))) continue
      const at = atTime(day.getFullYear(), day.getMonth(), day.getDate(), rule.timeOfDay)
      if (at > after) return at
    }
    return null
  }
  if (rule.repeat === 'monthly') {
    if (rule.monthDay === null) return null
    for (let offset = 0; offset <= 2; offset++) {
      const month = new Date(start.getFullYear(), start.getMonth() + offset, 1)
      const year = month.getFullYear()
      const day = Math.min(rule.monthDay, daysInMonth(year, month.getMonth()))
      const at = atTime(year, month.getMonth(), day, rule.timeOfDay)
      if (at > after) return at
    }
  }
  return null
}

export function isDue(reminder: Pick<Reminder, 'dueAt'>, now: number): boolean {
  return reminder.dueAt <= now
}

/** Due and not yet announced with a notification. */
export function needsNotification(
  reminder: Pick<Reminder, 'dueAt' | 'firedAt'>,
  now: number,
): boolean {
  return reminder.dueAt <= now && (reminder.firedAt === null || reminder.firedAt < reminder.dueAt)
}

/**
 * Due date after marking a reminder done: the next occurrence for repeating reminders,
 * null when a one-time reminder should be removed.
 */
export function dueAfterDone(reminder: Reminder, now: number): number | null {
  if (reminder.repeat === 'none') return null
  return nextOccurrence(reminder, Math.max(now, reminder.dueAt))
}

export const TIME_PRESETS = ['hour', 'tomorrow', 'days3', 'nextWeek'] as const
export type TimePreset = (typeof TIME_PRESETS)[number]

/** Quick picks used for snoozing and new one-time reminders. */
export function presetTime(preset: TimePreset, now: number): number {
  const date = new Date(now)
  const y = date.getFullYear()
  const m = date.getMonth()
  const d = date.getDate()
  switch (preset) {
    case 'hour': {
      const fiveMinutes = 5 * 60_000
      return Math.ceil((now + HOUR) / fiveMinutes) * fiveMinutes
    }
    case 'tomorrow':
      return atTime(y, m, d + 1, DEFAULT_TIME_OF_DAY)
    case 'days3':
      return atTime(y, m, d + 3, DEFAULT_TIME_OF_DAY)
    case 'nextWeek':
      return atTime(y, m, d + 7 - weekdayOf(date), DEFAULT_TIME_OF_DAY)
  }
}

/** Splits reminders into due (oldest first) and upcoming (soonest first). */
export function splitReminders<T extends Pick<Reminder, 'dueAt'>>(
  reminders: readonly T[],
  now: number,
): { due: T[]; upcoming: T[] } {
  const sorted = [...reminders].sort((a, b) => a.dueAt - b.dueAt)
  return {
    due: sorted.filter((r) => isDue(r, now)),
    upcoming: sorted.filter((r) => !isDue(r, now)),
  }
}
