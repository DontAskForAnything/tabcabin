import {
  type Category,
  type Change,
  type EntityType,
  type Group,
  makeGroup,
  positionAtEnd,
  put,
  touch,
} from '@tabcabin/core'
import { loadRow } from '../../apply'
import { db } from '../../db'
import { clock, commit, mustGet } from '../commit'
import { getCategories, getGroups, getTopLevelItems } from '../reads'
import { deletedInside } from './inside'

export interface RestoreTarget {
  workspaceId: string
  categoryId: string
  restoredGroupTitle: string
}

/** Restores a bin entry with everything deleted together with it. */
export async function restoreFromBin(entity: EntityType, id: string, target: RestoreTarget) {
  const c = clock()
  const restoreRow = <T extends { updatedAt: number; deletedAt: number | null }>(
    row: T,
    patch: Partial<T> = {},
  ) => touch(row, { ...patch, deletedAt: null } as Partial<T>, c)
  const changes: Change[] = []

  const restoreGroupTree = async (
    group: Group,
    deletedAt: number | null,
    patch: Partial<Group> = {},
  ) => {
    changes.push(put('group', restoreRow(group, patch)))
    const items = await db.items.where('groupId').equals(group.id).toArray()
    for (const item of items)
      if (item.deletedAt === deletedAt) changes.push(put('item', restoreRow(item)))
  }
  const restoreCategoryTree = async (
    category: Category,
    deletedAt: number | null,
    patch: Partial<Category> = {},
  ) => {
    changes.push(put('category', restoreRow(category, patch)))
    const groups = await db.groups.where('categoryId').equals(category.id).toArray()
    for (const group of groups)
      if (group.deletedAt === deletedAt) await restoreGroupTree(group, deletedAt)
  }

  if (entity === 'workspace') {
    const ws = await mustGet('workspace', id)
    changes.push(put('workspace', restoreRow(ws)))
    const categories = await db.categories.where('workspaceId').equals(id).toArray()
    for (const category of categories)
      if (category.deletedAt === ws.deletedAt) await restoreCategoryTree(category, ws.deletedAt)
  } else if (entity === 'category') {
    const category = await mustGet('category', id)
    const parent = await loadRow('workspace', category.workspaceId)
    const orphan = !parent || parent.deletedAt !== null
    await restoreCategoryTree(
      category,
      category.deletedAt,
      orphan
        ? {
            workspaceId: target.workspaceId,
            position: positionAtEnd(await getCategories(target.workspaceId)),
          }
        : {},
    )
  } else if (entity === 'group') {
    const group = await mustGet('group', id)
    const parent = await loadRow('category', group.categoryId)
    const orphan = !parent || parent.deletedAt !== null
    await restoreGroupTree(
      group,
      group.deletedAt,
      orphan
        ? {
            categoryId: target.categoryId,
            position: positionAtEnd(await getGroups(target.categoryId)),
          }
        : {},
    )
  } else if (entity === 'item') {
    const item = await mustGet('item', id)
    const group = await loadRow('group', item.groupId)
    const parent = item.parentId ? await loadRow('item', item.parentId) : undefined
    let groupId = item.groupId
    if (!group || group.deletedAt !== null) {
      const groups = await getGroups(target.categoryId)
      let restored = groups.find((g) => g.title === target.restoredGroupTitle)
      if (!restored) {
        restored = makeGroup(
          {
            categoryId: target.categoryId,
            position: positionAtEnd(groups),
            title: target.restoredGroupTitle,
            emoji: '♻️',
          },
          c,
        )
        changes.push(put('group', restored))
      }
      groupId = restored.id
    }
    const detached = groupId !== item.groupId || (parent !== undefined && parent.deletedAt !== null)
    const siblings = await getTopLevelItems(groupId)
    changes.push(
      put(
        'item',
        restoreRow(
          item,
          detached ? { groupId, parentId: null, position: positionAtEnd(siblings) } : {},
        ),
      ),
    )
    // What was deleted with it comes back too: a stack's links, the notes pinned to a link.
    for (const child of await deletedInside(item.id, item.deletedAt))
      changes.push(put('item', restoreRow(child, detached ? { groupId } : {})))
  }
  return commit(changes)
}
