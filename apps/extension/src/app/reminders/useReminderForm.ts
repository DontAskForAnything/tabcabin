import {
  DEFAULT_TIME_OF_DAY,
  minutesOfDay,
  nextOccurrence,
  presetTime,
  type Reminder,
  type ReminderRule,
  weekdayOf,
} from '@tabcabin/core'
import { useMemo, useState } from 'react'
import type { ReminderInput } from '@/db/repo'
import { useT } from '@/i18n'
import { formatMinutes, fromInputs, parseTime, toInputs } from './format'

export type Mode = 'once' | 'repeat'
export type RepeatKind = 'weekly' | 'monthly'

export type ReminderFormResult = { input: ReminderInput } | { error: string }

export function useReminderForm(initial: Reminder | undefined) {
  const t = useT()
  const [now] = useState(() => Date.now())
  const start = initial?.dueAt ?? presetTime('tomorrow', now)
  const [mode, setMode] = useState<Mode>(initial && initial.repeat !== 'none' ? 'repeat' : 'once')
  const [date, setDate] = useState(toInputs(start).date)
  const [time, setTime] = useState(toInputs(start).time)
  const [repeat, setRepeat] = useState<RepeatKind>(
    initial?.repeat === 'monthly' ? 'monthly' : 'weekly',
  )
  const [weekdays, setWeekdays] = useState<number[]>(
    initial?.weekdays.length ? initial.weekdays : [weekdayOf(now)],
  )
  const [monthDay, setMonthDay] = useState(initial?.monthDay ?? new Date(now).getDate())
  const [repeatTime, setRepeatTime] = useState(
    formatMinutes(initial?.timeOfDay ?? DEFAULT_TIME_OF_DAY),
  )

  const result = useMemo<ReminderFormResult>(() => {
    const current = Date.now()
    if (mode === 'once') {
      const dueAt = fromInputs(date, time)
      if (dueAt === null || dueAt <= current) return { error: t('reminders.inPast') }
      return {
        input: {
          dueAt,
          repeat: 'none',
          weekdays: [],
          monthDay: null,
          timeOfDay: minutesOfDay(dueAt),
        },
      }
    }
    const timeOfDay = parseTime(repeatTime) ?? DEFAULT_TIME_OF_DAY
    if (repeat === 'weekly' && weekdays.length === 0) return { error: t('reminders.pickDay') }
    const rule: ReminderRule =
      repeat === 'weekly'
        ? { repeat, weekdays: [...weekdays].sort(), monthDay: null, timeOfDay }
        : { repeat, weekdays: [], monthDay, timeOfDay }
    const dueAt = nextOccurrence(rule, current)
    if (dueAt === null) return { error: t('reminders.pickDay') }
    return { input: { ...rule, dueAt } }
  }, [mode, date, time, repeat, weekdays, monthDay, repeatTime, t])

  return {
    mode,
    setMode,
    date,
    setDate,
    time,
    setTime,
    repeat,
    setRepeat,
    weekdays,
    setWeekdays,
    monthDay,
    setMonthDay,
    repeatTime,
    setRepeatTime,
    result,
  }
}

export type ReminderFormState = ReturnType<typeof useReminderForm>
