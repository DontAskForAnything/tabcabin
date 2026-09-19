import {
  type Category,
  type Group,
  type Item,
  sortByPosition,
  type Workspace,
} from '@tabhangar/core'
import { db } from '../db'
import { live } from './commit'

export async function getWorkspaces(): Promise<Workspace[]> {
  return sortByPosition(live(await db.workspaces.toArray()))
}

export async function getCategories(workspaceId: string): Promise<Category[]> {
  return sortByPosition(
    live(await db.categories.where('workspaceId').equals(workspaceId).toArray()),
  )
}

export async function getGroups(categoryId: string): Promise<Group[]> {
  return sortByPosition(live(await db.groups.where('categoryId').equals(categoryId).toArray()))
}

/** Live items of a group (top level and stack children). */
export async function getGroupItems(groupId: string): Promise<Item[]> {
  return live(await db.items.where('groupId').equals(groupId).toArray())
}

export async function getTopLevelItems(groupId: string): Promise<Item[]> {
  return sortByPosition((await getGroupItems(groupId)).filter((item) => item.parentId === null))
}

export async function descendantsOfCategories(categoryIds: string[]) {
  const groups = live(await db.groups.where('categoryId').anyOf(categoryIds).toArray())
  const items = live(
    await db.items
      .where('groupId')
      .anyOf(groups.map((g) => g.id))
      .toArray(),
  )
  return { groups, items }
}
