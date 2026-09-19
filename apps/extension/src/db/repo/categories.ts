import {
  type Category,
  makeCategory,
  positionAtEnd,
  positionAtIndex,
  put,
  puts,
  touch,
} from '@tabhangar/core'
import { clock, commit, mustGet, type Result } from './commit'
import { descendantsOfCategories, getCategories } from './reads'

export async function createCategory(
  workspaceId: string,
  name: string,
  index?: number,
): Promise<Result & { categoryId: string }> {
  const siblings = await getCategories(workspaceId)
  const position = index === undefined ? positionAtEnd(siblings) : positionAtIndex(siblings, index)
  const category = makeCategory({ workspaceId, name, position }, clock())
  return { ...(await commit([put('category', category)])), categoryId: category.id }
}

export async function updateCategory(id: string, patch: Partial<Pick<Category, 'name'>>) {
  const row = await mustGet('category', id)
  return commit([put('category', touch(row, patch, clock()))])
}

/** Moves a category inside its workspace or into another one. */
export async function moveCategory(id: string, target: { workspaceId: string; index?: number }) {
  const row = await mustGet('category', id)
  const siblings = (await getCategories(target.workspaceId)).filter((cat) => cat.id !== id)
  const position =
    target.index === undefined ? positionAtEnd(siblings) : positionAtIndex(siblings, target.index)
  return commit([
    put('category', touch(row, { workspaceId: target.workspaceId, position }, clock())),
  ])
}

export async function deleteCategory(id: string) {
  const c = clock()
  const category = await mustGet('category', id)
  const { groups, items } = await descendantsOfCategories([id])
  const deleted = { deletedAt: c.now }
  return commit([
    put('category', touch(category, deleted, c)),
    ...puts(
      'group',
      groups.map((row) => touch(row, deleted, c)),
    ),
    ...puts(
      'item',
      items.map((row) => touch(row, deleted, c)),
    ),
  ])
}
