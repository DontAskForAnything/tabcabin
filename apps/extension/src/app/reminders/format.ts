import { type ReminderRule, startOfDay } from '@tabhangar/core'
import type { Translate } from '@/i18n/translate'
import type { Locale } from '@/i18n/types'

const DAY = 86_400_000

/** Short weekday names starting on Monday. */
export function weekdayNames(locale: Locale, width: 'short' | 'narrow' = 'short'): string[] {
  const format = new Intl.DateTimeFormat(locale, { weekday: width })
  // 2024-01-01 was a Monday.
  return Array.from({ length: 7 }, (_, i) => format.format(new Date(2024, 0, 1 + i)))
}

export function formatTime(ts: number, locale: Locale): string {
  return new Intl.DateTimeFormat(locale, { hour: '2-digit', minute: '2-digit' }).format(ts)
}

/** "Today", "Tomorrow", or a short date (with the year when it differs). */
export function formatDay(ts: number, locale: Locale, t: Translate, now = Date.now()): string {
  const diff = Math.round((startOfDay(ts) - startOfDay(now)) / DAY)
  if (diff === 0) return t('reminders.today')
  if (diff === 1) return t('reminders.tomorrow')
  if (diff === -1) return t('reminders.yesterday')
  const sameYear = new Date(ts).getFullYear() === new Date(now).getFullYear()
  return new Intl.DateTimeFormat(locale, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(ts)
}

export function formatDue(ts: number, locale: Locale, t: Translate, now = Date.now()): string {
  return `${formatDay(ts, locale, t, now)}, ${formatTime(ts, locale)}`
}

/** "Every Mon, Thu" / "Every day" / "Monthly on day 15"; null for one-time reminders. */
export function repeatLabel(rule: ReminderRule, locale: Locale, t: Translate): string | null {
  if (rule.repeat === 'weekly') {
    if (rule.weekdays.length === 7) return t('reminders.everyDay')
    const names = weekdayNames(locale)
    const days = [...rule.weekdays].sort().map((day) => names[day])
    return t('reminders.everyWeek', { days: days.join(', ') })
  }
  if (rule.repeat === 'monthly' && rule.monthDay !== null)
    return t('reminders.everyMonth', { day: rule.monthDay })
  return null
}

/** `yyyy-mm-dd` and `hh:mm` for native date/time inputs. */
export function toInputs(ts: number): { date: string; time: string } {
  const d = new Date(ts)
  const pad = (n: number) => String(n).padStart(2, '0')
  return {
    date: `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
  }
}

export function fromInputs(date: string, time: string): number | null {
  const [y, m, d] = date.split('-').map(Number)
  const minutes = parseTime(time)
  if (!y || !m || !d || minutes === null) return null
  return new Date(y, m - 1, d, Math.floor(minutes / 60), minutes % 60).getTime()
}

export function parseTime(time: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(time)
  if (!match) return null
  const h = Number(match[1])
  const min = Number(match[2])
  return h < 24 && min < 60 ? h * 60 + min : null
}

export function formatMinutes(minutes: number): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${pad(Math.floor(minutes / 60))}:${pad(minutes % 60)}`
}
