import {
  makeCategory,
  makeWorkspace,
  positionAtEnd,
  positionAtIndex,
  positionBetween,
  put,
  puts,
  touch,
  type Workspace,
} from '@tabcabin/core'
import { clock, commit, mustGet, type Result } from './commit'
import { descendantsOfCategories, getCategories, getWorkspaces } from './reads'

export async function createWorkspace(input: {
  name: string
  emoji?: string
  categoryName: string
}): Promise<Result & { workspaceId: string; categoryId: string }> {
  const c = clock()
  const workspace = makeWorkspace(
    { name: input.name, emoji: input.emoji, position: positionAtEnd(await getWorkspaces()) },
    c,
  )
  const category = makeCategory(
    { workspaceId: workspace.id, name: input.categoryName, position: positionBetween(null, null) },
    c,
  )
  const result = await commit([put('workspace', workspace), put('category', category)])
  return { ...result, workspaceId: workspace.id, categoryId: category.id }
}

export async function updateWorkspace(
  id: string,
  patch: Partial<Pick<Workspace, 'name' | 'emoji'>>,
) {
  const row = await mustGet('workspace', id)
  return commit([put('workspace', touch(row, patch, clock()))])
}

export async function reorderWorkspace(id: string, index: number) {
  const others = (await getWorkspaces()).filter((ws) => ws.id !== id)
  const row = await mustGet('workspace', id)
  return commit([
    put('workspace', touch(row, { position: positionAtIndex(others, index) }, clock())),
  ])
}

export async function deleteWorkspace(id: string) {
  const c = clock()
  const workspace = await mustGet('workspace', id)
  const categories = await getCategories(id)
  const { groups, items } = await descendantsOfCategories(categories.map((cat) => cat.id))
  const deleted = { deletedAt: c.now }
  return commit([
    put('workspace', touch(workspace, deleted, c)),
    ...puts(
      'category',
      categories.map((row) => touch(row, deleted, c)),
    ),
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
