import {
  type Category,
  type Group,
  type Item,
  type Reminder,
  sortByPosition,
  type Workspace,
} from '@tabhangar/core'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { getCategories, getWorkspaces } from './repo'

export interface BoardItem extends Item {
  /** Links inside a stack (empty for other kinds). */
  children: Item[]
}

export interface BoardGroup extends Group {
  items: BoardItem[]
  /** All live items including stack children (for counts). */
  allItems: Item[]
  /** Live reminders by item id. */
  reminders: Record<string, Reminder>
}

const live = <T extends { deletedAt: number | null }>(rows: readonly T[]) =>
  rows.filter((row) => row.deletedAt === null)

export async function loadBoard(categoryId: string): Promise<BoardGroup[]> {
  const groups = sortByPosition(
    live(await db.groups.where('categoryId').equals(categoryId).toArray()),
  )
  const items = live(
    await db.items
      .where('groupId')
      .anyOf(groups.map((group) => group.id))
      .toArray(),
  )
  const reminders: Record<string, Reminder> = {}
  for (const reminder of await db.reminders
    .where('itemId')
    .anyOf(items.map((item) => item.id))
    .toArray())
    if (reminder.deletedAt === null) reminders[reminder.itemId] = reminder
  const byGroup = new Map<string, Item[]>()
  for (const item of items) {
    const list = byGroup.get(item.groupId) ?? []
    list.push(item)
    byGroup.set(item.groupId, list)
  }
  return groups.map((group) => {
    const all = byGroup.get(group.id) ?? []
    const top = sortByPosition(all.filter((item) => item.parentId === null))
    return {
      ...group,
      allItems: all,
      reminders,
      items: top.map((item) => ({
        ...item,
        children:
          item.kind === 'stack'
            ? sortByPosition(all.filter((child) => child.parentId === item.id))
            : [],
      })),
    }
  })
}

export function useWorkspaces(): Workspace[] | undefined {
  return useLiveQuery(getWorkspaces, [])
}

export function useCategories(workspaceId: string | null | undefined): Category[] | undefined {
  return useLiveQuery(
    () => (workspaceId ? getCategories(workspaceId) : Promise.resolve([] as Category[])),
    [workspaceId],
  )
}

export function useBoard(categoryId: string | null | undefined): BoardGroup[] | undefined {
  return useLiveQuery(
    () => (categoryId ? loadBoard(categoryId) : Promise.resolve([] as BoardGroup[])),
    [categoryId],
  )
}
