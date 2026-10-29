import {
  type Category,
  type Group,
  type Item,
  type Reminder,
  sortByPosition,
  type Workspace,
} from '@tabcabin/core'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from './db'
import { getCategories, getWorkspaces } from './repo'

export interface BoardItem extends Item {
  /** Links inside a stack, notes pinned to a link (empty for other kinds). */
  children: BoardItem[]
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
    const ids = new Set(all.map((item) => item.id))
    const inside = new Map<string, Item[]>()
    for (const item of all)
      if (item.parentId && ids.has(item.parentId))
        inside.set(item.parentId, [...(inside.get(item.parentId) ?? []), item])
    const withChildren = (item: Item): BoardItem => ({
      ...item,
      children: sortByPosition(inside.get(item.id) ?? []).map(withChildren),
    })
    // An item whose parent is gone (removed by an older version) shows at the top level.
    const top = sortByPosition(all.filter((item) => !item.parentId || !ids.has(item.parentId)))
    return { ...group, allItems: all, reminders, items: top.map(withChildren) }
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
