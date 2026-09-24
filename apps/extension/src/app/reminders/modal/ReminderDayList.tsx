import type { ReminderEntry } from '@/db/reminders'
import { type Locale, useLocale } from '@/i18n'
import type { ActiveContext } from '../../useActive'
import { ReminderCard } from './ReminderCard'

function dayParts(ts: number, locale: Locale) {
  const date = new Date(ts)
  return {
    weekday: new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date),
    day: date.getDate(),
    month: new Intl.DateTimeFormat(locale, { month: 'short' }).format(date),
  }
}

export function ReminderDayList({
  entries,
  due,
  now,
  active,
}: {
  entries: ReminderEntry[]
  due: boolean
  now: number
  active: ActiveContext
}) {
  const locale = useLocale()
  const days: { key: string; ts: number; entries: ReminderEntry[] }[] = []
  for (const entry of entries) {
    const date = new Date(entry.reminder.dueAt)
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    const last = days.at(-1)
    if (last?.key === key) last.entries.push(entry)
    else days.push({ key, ts: entry.reminder.dueAt, entries: [entry] })
  }
  return (
    <div className="flex flex-col gap-3">
      {days.map((day) => {
        const parts = dayParts(day.ts, locale)
        return (
          <div key={day.key} className="grid grid-cols-[52px_1fr] gap-3">
            <div className="flex flex-col items-center border-r-2 border-line pt-1.5 pr-3 text-center">
              <span className="text-[12px] font-medium text-ink-3 capitalize">{parts.weekday}</span>
              <span className="text-[22px] leading-tight font-semibold tracking-[-0.02em]">
                {parts.day}
              </span>
              <span className="text-[11.5px] text-ink-3">{parts.month}</span>
            </div>
            <div className="flex min-w-0 flex-col gap-2.5">
              {day.entries.map((entry) => (
                <ReminderCard
                  key={entry.reminder.id}
                  entry={entry}
                  due={due}
                  now={now}
                  active={active}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
