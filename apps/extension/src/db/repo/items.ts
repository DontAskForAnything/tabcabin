import {
  canNest,
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
import { countActivity } from '../activity/count'
import { db } from '../db'
import { clock, commit, live, mustGet, type Result } from './commit'
import { descendantsOf, getGroupItems, getTopLevelItems } from './reads'

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
  const result = await commit([put('item', touch(row, patch, clock()))])
  // Ticking a to-do off counts for the week; unticking it takes that back.
  const ticked = patch.done !== undefined && patch.done !== row.done
  if (ticked && row.todo && patch.todo !== false) await countActivity({ done: patch.done ? 1 : -1 })
  return result
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

/**
 * Moves items (in the given order) into a group, a stack (links) or a link (notes) at `index`.
 * Items that cannot live in that place stay where they are.
 */
export async function moveItemsTo(
  ids: readonly string[],
  target: { groupId: string; index: number; parentId?: string | null },
) {
  const parentId = target.parentId ?? null
  const parent = parentId ? await mustGet('item', parentId) : null
  const moving = (await db.items.bulkGet([...ids])).filter(
    (item): item is Item => !!item && (!parent || canNest(parent.kind, item.kind)),
  )
  const siblings = live(await db.items.where('groupId').equals(target.groupId).toArray()).filter(
    (item) => item.parentId === parentId,
  )
  const rows = moveItems(
    {
      moving,
      children: (await descendantsOf(moving.map((item) => item.id))).filter(
        (child) => !ids.includes(child.id),
      ),
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
): Promise<(Result & { ok: true; pinned?: true }) | { ok: false; error: CombineError }> {
  const dragged = (await db.items.bulkGet([...ids])).filter((item): item is Item => !!item)
  const target = await mustGet('item', targetId)
  const inside = await descendantsOf(dragged.map((item) => item.id))
  const c = clock()
  const outcome = combineItems(
    dragged,
    target,
    {
      targetChildren: await descendantsOf([target.id], 1),
      draggedChildren: inside.filter((child) => dragged.some((item) => item.id === child.parentId)),
    },
    c,
  )
  if (!outcome.ok) return outcome
  // Notes pinned to the dragged links come along from another group.
  const changed = new Set(outcome.rows.map((row) => row.id))
  const following = inside
    .filter((child) => !changed.has(child.id) && child.groupId !== target.groupId)
    .map((child) => touch(child, { groupId: target.groupId }, c))
  return {
    ok: true,
    pinned: outcome.pinned,
    ...(await commit(puts('item', [...outcome.rows, ...following]))),
  }
}

export async function unstackById(stackId: string) {
  const stack = await mustGet('item', stackId)
  const rows = unstack(
    stack,
    await descendantsOf([stackId], 1),
    await getGroupItems(stack.groupId),
    clock(),
  )
  return commit(puts('item', rows))
}

export async function deleteItems(ids: readonly string[]) {
  const c = clock()
  const rows = (await db.items.bulkGet([...ids])).filter((item): item is Item => !!item)
  // What is inside goes too: the links of a stack, the notes pinned to a link.
  const children = (await descendantsOf(rows.map((row) => row.id))).filter(
    (child) => !ids.includes(child.id),
  )
  return commit(
    puts(
      'item',
      [...rows, ...children].map((row) => touch(row, { deletedAt: c.now }, c)),
    ),
  )
}
