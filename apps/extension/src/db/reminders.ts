import type { Category, Group, Item, Reminder, Workspace } from '@tabcabin/core'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'

export interface ReminderEntry {
  reminder: Reminder
  item: Item
  group: Group
  category: Category
  workspace: Workspace
}

/** Live reminders whose item and all its parents are live, soonest first. */
export async function loadReminders(): Promise<ReminderEntry[]> {
  const reminders = (await db.reminders.toArray()).filter((r) => r.deletedAt === null)
  if (reminders.length === 0) return []
  const items = await db.items.bulkGet(reminders.map((r) => r.itemId))
  const groups = await db.groups.bulkGet(items.map((i) => i?.groupId ?? ''))
  const categories = await db.categories.bulkGet(groups.map((g) => g?.categoryId ?? ''))
  const workspaces = await db.workspaces.bulkGet(categories.map((c) => c?.workspaceId ?? ''))
  const parents = await db.items.bulkGet(items.map((i) => i?.parentId ?? ''))

  const entries: ReminderEntry[] = []
  reminders.forEach((reminder, index) => {
    const item = items[index]
    const group = groups[index]
    const category = categories[index]
    const workspace = workspaces[index]
    const parent = parents[index]
    const rows = [item, group, category, workspace]
    if (!item || !group || !category || !workspace) return
    if (rows.some((row) => row?.deletedAt !== null)) return
    if (item.parentId && (!parent || parent.deletedAt !== null)) return
    entries.push({ reminder, item, group, category, workspace })
  })
  return entries.sort((a, b) => a.reminder.dueAt - b.reminder.dueAt)
}

export function useReminders(): ReminderEntry[] | undefined {
  return useLiveQuery(loadReminders, [])
}
