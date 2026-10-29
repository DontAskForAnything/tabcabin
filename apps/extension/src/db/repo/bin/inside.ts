import type { Item } from '@tabcabin/core'
import { db } from '../../db'

/**
 * Items deleted together with an item and living inside it: the links of a stack, the notes
 * pinned to a link, and the notes pinned to the links of a stack.
 */
export async function deletedInside(id: string, deletedAt: number | null): Promise<Item[]> {
  const children = (await db.items.where('parentId').equals(id).toArray()).filter(
    (child) => child.deletedAt !== null && child.deletedAt === deletedAt,
  )
  const nested = await Promise.all(children.map((child) => deletedInside(child.id, deletedAt)))
  return [...children, ...nested.flat()]
}
