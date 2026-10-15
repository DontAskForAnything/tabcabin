import {
  makeCategory,
  makeGroup,
  makeItem,
  makeWorkspace,
  positionAtEnd,
  positionAtIndex,
  positionBetween,
  positionsAtEnd,
  put,
  puts,
  type TemplateRow,
  touch,
  type Workspace,
} from '@tabcabin/core'
import { clock, commit, mustGet, type Result } from './commit'
import { descendantsOfCategories, getCategories, getWorkspaces } from './reads'

/** A new workspace with one category, empty or with the groups (and items) of a template. */
export async function createWorkspace(input: {
  name: string
  emoji?: string
  categoryName: string
  groups?: { title: string; emoji: string; items?: TemplateRow[] }[]
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
  const specs = input.groups ?? []
  const positions = positionsAtEnd([], specs.length)
  const groups = specs.map(({ title, emoji }, index) =>
    makeGroup({ categoryId: category.id, position: positions[index]!, title, emoji }, c),
  )
  const items = specs.flatMap(({ items = [] }, index) => {
    const keys = positionsAtEnd([], items.length)
    return items.map((item, k) =>
      makeItem({ groupId: groups[index]!.id, position: keys[k]!, ...item }, c),
    )
  })
  const result = await commit([
    put('workspace', workspace),
    put('category', category),
    ...puts('group', groups),
    ...puts('item', items),
  ])
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
