import { type Change, dueAfterDone, makeReminder, put, type Reminder, touch } from '@tabhangar/core'
import { applyChanges } from '../apply'
import { db } from '../db'
import { clock, commit, live, mustGet } from './commit'

export type ReminderInput = Pick<
  Reminder,
  'dueAt' | 'repeat' | 'weekdays' | 'monthDay' | 'timeOfDay'
>

/** The live reminder of an item (an item has at most one). */
export async function getItemReminder(itemId: string): Promise<Reminder | undefined> {
  return live(await db.reminders.where('itemId').equals(itemId).toArray())[0]
}

/** Creates or replaces the reminder of an item. */
export async function setReminder(itemId: string, input: ReminderInput) {
  const c = clock()
  const [current, ...extra] = live(await db.reminders.where('itemId').equals(itemId).toArray())
  const changes: Change[] = extra.map((row) => put('reminder', touch(row, { deletedAt: c.now }, c)))
  changes.push(
    put(
      'reminder',
      current
        ? touch(current, { ...input, firedAt: null }, c)
        : makeReminder({ itemId, ...input }, c),
    ),
  )
  return commit(changes)
}

export async function removeReminder(id: string) {
  const c = clock()
  return commit([put('reminder', touch(await mustGet('reminder', id), { deletedAt: c.now }, c))])
}

/** Marks a reminder done: one-time reminders are removed, repeating ones move to the next date. */
export async function completeReminder(id: string) {
  const c = clock()
  const row = await mustGet('reminder', id)
  const next = dueAfterDone(row, c.now)
  return commit([
    put(
      'reminder',
      touch(row, next === null ? { deletedAt: c.now } : { dueAt: next, firedAt: null }, c),
    ),
  ])
}

export async function snoozeReminder(id: string, until: number) {
  const row = await mustGet('reminder', id)
  return commit([put('reminder', touch(row, { dueAt: until, firedAt: null }, clock()))])
}

export async function markRemindersFired(ids: readonly string[]) {
  const c = clock()
  const rows = await db.reminders.bulkGet([...ids])
  await applyChanges(
    rows.flatMap((row) => (row ? [put('reminder', touch(row, { firedAt: c.now }, c))] : [])),
  )
}
