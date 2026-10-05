import {
  duplicateGroup as duplicateGroupOp,
  type Group,
  makeGroup,
  positionAtEnd,
  positionAtIndex,
  put,
  puts,
  sortItems,
  type SortMode,
  touch,
} from '@tabcabin/core'
import { clock, commit, mustGet, type Result } from './commit'
import { getGroupItems, getGroups } from './reads'

export async function createGroup(
  categoryId: string,
  input: { title?: string; emoji?: string; index?: number } = {},
): Promise<Result & { groupId: string }> {
  const siblings = await getGroups(categoryId)
  const position =
    input.index === undefined ? positionAtEnd(siblings) : positionAtIndex(siblings, input.index)
  const group = makeGroup({ categoryId, position, title: input.title, emoji: input.emoji }, clock())
  return { ...(await commit([put('group', group)])), groupId: group.id }
}

export async function updateGroup(
  id: string,
  patch: Partial<Pick<Group, 'title' | 'emoji' | 'collapsed' | 'width'>>,
) {
  const row = await mustGet('group', id)
  return commit([put('group', touch(row, patch, clock()))])
}

export async function moveGroup(id: string, target: { categoryId: string; index: number }) {
  const row = await mustGet('group', id)
  const siblings = (await getGroups(target.categoryId)).filter((group) => group.id !== id)
  return commit([
    put(
      'group',
      touch(
        row,
        { categoryId: target.categoryId, position: positionAtIndex(siblings, target.index) },
        clock(),
      ),
    ),
  ])
}

export async function deleteGroup(id: string) {
  const c = clock()
  const group = await mustGet('group', id)
  const items = await getGroupItems(id)
  const deleted = { deletedAt: c.now }
  return commit([
    put('group', touch(group, deleted, c)),
    ...puts(
      'item',
      items.map((row) => touch(row, deleted, c)),
    ),
  ])
}

export async function duplicateGroup(id: string, titleSuffix: string) {
  const group = await mustGet('group', id)
  const siblings = await getGroups(group.categoryId)
  const index = siblings.findIndex((g) => g.id === id)
  const copy = duplicateGroupOp(
    group,
    await getGroupItems(id),
    positionAtIndex(siblings, index + 1),
    clock(),
    titleSuffix,
  )
  const result = await commit([put('group', copy.group), ...puts('item', copy.items)])
  return { ...result, groupId: copy.group.id }
}

export async function sortGroup(id: string, mode: SortMode, locale: string) {
  return commit(puts('item', sortItems(await getGroupItems(id), mode, clock(), locale)))
}
