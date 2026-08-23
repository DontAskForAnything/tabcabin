import { describe, expect, it } from 'vitest'
import { makeReminder } from './factories'
import {
  dueAfterDone,
  minutesOfDay,
  needsNotification,
  nextOccurrence,
  presetTime,
  type ReminderRule,
  splitReminders,
  weekdayOf,
} from './reminders'

// 2026-10-07 is a Wednesday. All dates are local.
const at = (month: number, day: number, hour = 0, minute = 0) =>
  new Date(2026, month - 1, day, hour, minute).getTime()
const clock = { now: at(10, 7, 12) }

describe('weekdayOf', () => {
  it('counts from Monday', () => {
    expect(weekdayOf(at(10, 5))).toBe(0)
    expect(weekdayOf(at(10, 7))).toBe(2)
    expect(weekdayOf(at(10, 11))).toBe(6)
  })
})

describe('nextOccurrence', () => {
  const weekly = (weekdays: number[], timeOfDay = 9 * 60): ReminderRule => ({
    repeat: 'weekly',
    weekdays,
    monthDay: null,
    timeOfDay,
  })
  const monthly = (monthDay: number, timeOfDay = 9 * 60): ReminderRule => ({
    repeat: 'monthly',
    weekdays: [],
    monthDay,
    timeOfDay,
  })

  it('returns null for one-time reminders and empty rules', () => {
    expect(nextOccurrence({ ...weekly([]), repeat: 'none' }, clock.now)).toBeNull()
    expect(nextOccurrence(weekly([]), clock.now)).toBeNull()
  })

  it('finds the next selected weekday', () => {
    // Wed 12:00 → Thu 09:00
    expect(nextOccurrence(weekly([1, 3]), clock.now)).toBe(at(10, 8, 9))
    // Tuesday only → next week
    expect(nextOccurrence(weekly([1]), clock.now)).toBe(at(10, 13, 9))
  })

  it('uses today when the time has not passed yet', () => {
    expect(nextOccurrence(weekly([2], 18 * 60), clock.now)).toBe(at(10, 7, 18))
    expect(nextOccurrence(weekly([2], 12 * 60), clock.now)).toBe(at(10, 14, 12))
  })

  it('handles monthly days and short months', () => {
    expect(nextOccurrence(monthly(15), clock.now)).toBe(at(10, 15, 9))
    expect(nextOccurrence(monthly(7, 11 * 60), clock.now)).toBe(at(11, 7, 11))
    // 31st in November falls on the 30th
    expect(nextOccurrence(monthly(31), at(10, 31, 10))).toBe(at(11, 30, 9))
    // February in a non-leap year
    expect(nextOccurrence(monthly(30), at(1, 31, 10))).toBe(at(2, 28, 9))
  })

  it('rolls over the year', () => {
    expect(nextOccurrence(monthly(1), at(12, 15))).toBe(new Date(2027, 0, 1, 9).getTime())
  })
})

describe('reminder lifecycle', () => {
  it('derives the time of day from the first due date', () => {
    const reminder = makeReminder({ itemId: 'i', dueAt: at(10, 9, 14, 30) }, clock)
    expect(reminder.timeOfDay).toBe(14 * 60 + 30)
    expect(minutesOfDay(reminder.dueAt)).toBe(870)
  })

  it('removes one-time reminders and reschedules repeating ones when done', () => {
    const once = makeReminder({ itemId: 'i', dueAt: at(10, 7, 9) }, clock)
    expect(dueAfterDone(once, clock.now)).toBeNull()
    const repeating = makeReminder(
      { itemId: 'i', dueAt: at(10, 7, 9), repeat: 'weekly', weekdays: [0, 2], timeOfDay: 540 },
      clock,
    )
    expect(dueAfterDone(repeating, clock.now)).toBe(at(10, 12, 9))
  })

  it('skips the upcoming occurrence of a repeating reminder', () => {
    const repeating = makeReminder(
      { itemId: 'i', dueAt: at(10, 15, 9), repeat: 'monthly', monthDay: 15, timeOfDay: 540 },
      clock,
    )
    expect(dueAfterDone(repeating, clock.now)).toBe(at(11, 15, 9))
  })

  it('notifies once per due date', () => {
    const reminder = makeReminder({ itemId: 'i', dueAt: at(10, 7, 9) }, clock)
    expect(needsNotification(reminder, clock.now)).toBe(true)
    expect(needsNotification({ ...reminder, firedAt: clock.now }, clock.now)).toBe(false)
    expect(needsNotification({ ...reminder, dueAt: at(10, 8, 9) }, clock.now)).toBe(false)
    expect(needsNotification({ ...reminder, firedAt: at(10, 1) }, clock.now)).toBe(true)
  })

  it('splits due and upcoming reminders in time order', () => {
    const list = [{ dueAt: at(10, 9) }, { dueAt: at(10, 1) }, { dueAt: at(10, 7, 11) }]
    const { due, upcoming } = splitReminders(list, clock.now)
    expect(due.map((r) => r.dueAt)).toEqual([at(10, 1), at(10, 7, 11)])
    expect(upcoming.map((r) => r.dueAt)).toEqual([at(10, 9)])
  })
})

describe('presetTime', () => {
  it('rounds one hour ahead to five minutes', () => {
    expect(presetTime('hour', at(10, 7, 12, 2))).toBe(at(10, 7, 13, 5))
  })
  it('uses 9:00 for day presets and Monday for next week', () => {
    expect(presetTime('tomorrow', clock.now)).toBe(at(10, 8, 9))
    expect(presetTime('days3', clock.now)).toBe(at(10, 10, 9))
    expect(presetTime('nextWeek', clock.now)).toBe(at(10, 12, 9))
  })
})
