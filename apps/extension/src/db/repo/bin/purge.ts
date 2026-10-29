import { type Change, type EntityType, purge } from '@tabcabin/core'
import { loadRow } from '../../apply'
import { db } from '../../db'
import { commit } from '../commit'
import { deletedInside } from './inside'
import { listBin } from './list'

/** Adds purges of the reminders attached to purged items. */
async function withReminderPurges(changes: Change[]): Promise<Change[]> {
  const itemIds = changes.flatMap((c) => (c.type === 'purge' && c.entity === 'item' ? [c.id] : []))
  if (itemIds.length === 0) return changes
  const reminders = await db.reminders.where('itemId').anyOf(itemIds).toArray()
  return [...changes, ...reminders.map((r) => purge('reminder', r.id))]
}

/** Permanently removes a bin entry and everything deleted together with it. */
export async function purgeFromBin(entity: EntityType, id: string) {
  const changes: Change[] = [purge(entity, id)]
  const row = await loadRow(entity, id)
  if (!row) return { undo: [] }
  const ts = row.deletedAt
  if (entity === 'workspace' || entity === 'category' || entity === 'group') {
    const categoryIds =
      entity === 'workspace'
        ? (await db.categories.where('workspaceId').equals(id).toArray())
            .filter((c) => c.deletedAt === ts)
            .map((c) => c.id)
        : entity === 'category'
          ? [id]
          : []
    for (const cid of categoryIds) if (cid !== id) changes.push(purge('category', cid))
    const groupIds =
      entity === 'group'
        ? [id]
        : (await db.groups.where('categoryId').anyOf(categoryIds).toArray())
            .filter((g) => g.deletedAt === ts)
            .map((g) => g.id)
    for (const gid of groupIds) if (gid !== id) changes.push(purge('group', gid))
    const items = (await db.items.where('groupId').anyOf(groupIds).toArray()).filter(
      (i) => i.deletedAt === ts,
    )
    for (const item of items) changes.push(purge('item', item.id))
  } else if (entity === 'item') {
    for (const child of await deletedInside(id, ts)) changes.push(purge('item', child.id))
  }
  return commit(await withReminderPurges(changes))
}

export const BIN_LIMIT = 100

/** Permanently removes bin entries beyond the newest `keep`. */
export async function trimBin(keep = BIN_LIMIT) {
  const entries = await listBin()
  for (const entry of entries.slice(keep)) await purgeFromBin(entry.entity, entry.row.id)
  return Math.max(0, entries.length - keep)
}

export async function emptyBin() {
  const entries = await listBin()
  const undo: Change[] = []
  for (const entry of entries) undo.push(...(await purgeFromBin(entry.entity, entry.row.id)).undo)
  return { undo }
}
