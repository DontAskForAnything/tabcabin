import {
  combineItems,
  type CombineError,
  type Item,
  makeItem,
  makeLink,
  makeNote,
  moveItems,
  positionAtIndex,
  put,
  puts,
  touch,
  unstack,
} from '@tabcabin/core'
import { db } from '../db'
import { clock, commit, live, mustGet, type Result } from './commit'
import { getGroupItems, getTopLevelItems } from './reads'

export interface NewLink {
  url: string
  title?: string
  favIconUrl?: string | null
}

export async function addLinks(
  groupId: string,
  links: readonly NewLink[],
  index?: number,
): Promise<Result & { ids: string[] }> {
  const c = clock()
  const created = links.map((link) =>
    makeLink(
      { groupId, position: 'a0', url: link.url, title: link.title, favIconUrl: link.favIconUrl },
      c,
    ),
  )
  const siblings = await getTopLevelItems(groupId)
  const placed = moveItems(
    { moving: created, toGroupId: groupId, siblings, index: index ?? siblings.length },
    c,
  )
  const result = await commit(puts('item', placed))
  return { ...result, ids: placed.map((item) => item.id) }
}

export async function addNote(
  groupId: string,
  input: Partial<Pick<Item, 'text' | 'todo' | 'done' | 'color' | 'sourceUrl' | 'title'>> = {},
  placement: { index?: number; afterId?: string } = {},
): Promise<Result & { id: string }> {
  const c = clock()
  const siblings = await getTopLevelItems(groupId)
  let index = placement.index ?? siblings.length
  if (placement.afterId) {
    const at = siblings.findIndex((item) => item.id === placement.afterId)
    if (at >= 0) index = at + 1
  }
  const note = makeNote({ groupId, position: positionAtIndex(siblings, index), ...input }, c)
  return { ...(await commit([put('item', note)])), id: note.id }
}

export async function addImage(
  groupId: string,
  input: { imageUrl: string; title?: string; url?: string | null },
  index?: number,
): Promise<Result & { id: string }> {
  const siblings = await getTopLevelItems(groupId)
  const image = makeItem(
    {
      kind: 'image',
      groupId,
      position: positionAtIndex(siblings, index ?? siblings.length),
      imageUrl: input.imageUrl,
      title: input.title ?? '',
      url: input.url ?? null,
    },
    clock(),
  )
  return { ...(await commit([put('item', image)])), id: image.id }
}

export type ItemPatch = Partial<
  Pick<
    Item,
    | 'title'
    | 'url'
    | 'text'
    | 'color'
    | 'todo'
    | 'done'
    | 'emoji'
    | 'metaImageUrl'
    | 'favIconUrl'
    | 'imageUrl'
  >
>

export async function updateItem(id: string, patch: ItemPatch) {
  const row = await mustGet('item', id)
  return commit([put('item', touch(row, patch, clock()))])
}

/** Turns a note into a link or image (keeps its place in the group). */
export async function convertNote(id: string, kind: 'link' | 'image', url: string, title: string) {
  const row = await mustGet('item', id)
  const patch =
    kind === 'link'
      ? { kind, url, title, text: '', todo: false, done: false }
      : { kind, imageUrl: url, url: null, title, text: '', todo: false, done: false }
  return commit([put('item', touch(row, patch, clock()))])
}

async function childrenOf(stackIds: readonly string[]): Promise<Item[]> {
  if (stackIds.length === 0) return []
  return live(
    await db.items
      .where('parentId')
      .anyOf([...stackIds])
      .toArray(),
  )
}

/** Moves items (in the given order) into a group or a stack at `index`. */
export async function moveItemsTo(
  ids: readonly string[],
  target: { groupId: string; index: number; parentId?: string | null },
) {
  const moving = (await db.items.bulkGet([...ids])).filter((item): item is Item => !!item)
  const parentId = target.parentId ?? null
  const siblings = live(await db.items.where('groupId').equals(target.groupId).toArray()).filter(
    (item) => item.parentId === parentId,
  )
  const stacks = moving.filter((item) => item.kind === 'stack').map((item) => item.id)
  const rows = moveItems(
    {
      moving,
      children: await childrenOf(stacks),
      toGroupId: target.groupId,
      toParentId: parentId,
      siblings,
      index: target.index,
    },
    clock(),
  )
  return commit(puts('item', rows))
}

export async function combine(
  ids: readonly string[],
  targetId: string,
): Promise<(Result & { ok: true }) | { ok: false; error: CombineError }> {
  const dragged = (await db.items.bulkGet([...ids])).filter((item): item is Item => !!item)
  const target = await mustGet('item', targetId)
  const outcome = combineItems(
    dragged,
    target,
    {
      targetChildren: target.kind === 'stack' ? await childrenOf([target.id]) : [],
      draggedChildren: await childrenOf(dragged.filter((d) => d.kind === 'stack').map((d) => d.id)),
    },
    clock(),
  )
  if (!outcome.ok) return outcome
  return { ok: true, ...(await commit(puts('item', outcome.rows))) }
}

export async function unstackById(stackId: string) {
  const stack = await mustGet('item', stackId)
  const rows = unstack(
    stack,
    await childrenOf([stackId]),
    await getGroupItems(stack.groupId),
    clock(),
  )
  return commit(puts('item', rows))
}

export async function deleteItems(ids: readonly string[]) {
  const c = clock()
  const rows = (await db.items.bulkGet([...ids])).filter((item): item is Item => !!item)
  const children = await childrenOf(rows.filter((row) => row.kind === 'stack').map((row) => row.id))
  return commit(
    puts(
      'item',
      [...rows, ...children].map((row) => touch(row, { deletedAt: c.now }, c)),
    ),
  )
}
