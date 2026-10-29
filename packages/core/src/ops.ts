import { generateNKeysBetween } from 'fractional-indexing'
import { type Clock, makeItem, touch } from './factories'
import { newId } from './ids'
import { sortByPosition } from './position'
import { pinNotes } from './pins'
import { type Group, type Item } from './schema'

const live = <T extends { deletedAt: number | null }>(rows: readonly T[]) =>
  rows.filter((row) => row.deletedAt === null)

/** Keys for `count` entries inserted at `index` of `siblings` (sorted, without the moving entries). */
function keysAt(siblings: readonly { position: string }[], index: number, count: number): string[] {
  const at = Math.max(0, Math.min(index, siblings.length))
  const before = at > 0 ? (siblings[at - 1]?.position ?? null) : null
  const after = at < siblings.length ? (siblings[at]?.position ?? null) : null
  return generateNKeysBetween(before, after, count)
}

export interface MoveItemsInput {
  /** Items to move, in the order they should appear. */
  moving: readonly Item[]
  /** Items inside the moving ones (links of a stack, notes pinned to a link): they follow along. */
  children?: readonly Item[]
  toGroupId: string
  /** Set to a stack id to move links into that stack. */
  toParentId?: string | null
  /** Current items of the destination container (any order, may include moving items). */
  siblings: readonly Item[]
  /** Insertion index among the destination items that are not moving. */
  index: number
}

/** Moves items within or across groups/stacks. Returns every row that changed. */
export function moveItems(input: MoveItemsInput, clock: Clock): Item[] {
  const movingIds = new Set(input.moving.map((item) => item.id))
  const siblings = sortByPosition(live(input.siblings).filter((item) => !movingIds.has(item.id)))
  const keys = keysAt(siblings, input.index, input.moving.length)
  const toParentId = input.toParentId ?? null
  const moved = input.moving.map((item, i) =>
    touch(item, { groupId: input.toGroupId, parentId: toParentId, position: keys[i]! }, clock),
  )
  const children = (input.children ?? [])
    .filter((child) => child.groupId !== input.toGroupId)
    .map((child) => touch(child, { groupId: input.toGroupId }, clock))
  return [...moved, ...children]
}

export type CombineError = 'same-item' | 'note-with-link' | 'stack-with-note' | 'unsupported'

export type CombineResult =
  | {
      ok: true
      rows: Item[]
      /** The notes were pinned to a link rather than stacked or merged. */
      pinned?: true
    }
  | { ok: false; error: CombineError }

/**
 * Drops `dragged` onto `target`:
 * links/stacks onto a link or stack → one stack; notes onto a note → merged note;
 * notes onto a link → pinned to it (`targetChildren` are the notes it has).
 */
export function combineItems(
  dragged: readonly Item[],
  target: Item,
  context: { targetChildren: readonly Item[]; draggedChildren: readonly Item[] },
  clock: Clock,
): CombineResult {
  if (dragged.some((item) => item.id === target.id)) return { ok: false, error: 'same-item' }
  const kinds = new Set(dragged.map((item) => item.kind))

  if (target.kind === 'note') {
    if (kinds.size !== 1 || !kinds.has('note')) return { ok: false, error: 'note-with-link' }
    const text = [target.text, ...dragged.map((item) => item.text)]
      .filter((t) => t.trim())
      .join('\n')
    return {
      ok: true,
      rows: [
        touch(target, { text }, clock),
        ...dragged.map((item) => touch(item, { deletedAt: clock.now }, clock)),
      ],
    }
  }

  if (target.kind === 'link' && kinds.size === 1 && kinds.has('note'))
    return {
      ok: true,
      pinned: true,
      rows: pinNotes(dragged, target, context.targetChildren, clock),
    }

  if (target.kind !== 'link' && target.kind !== 'stack') return { ok: false, error: 'unsupported' }
  if (dragged.some((item) => item.kind === 'note')) return { ok: false, error: 'stack-with-note' }
  if (dragged.some((item) => item.kind !== 'link' && item.kind !== 'stack'))
    return { ok: false, error: 'unsupported' }

  // Links that end up inside the stack, in order: target's links first, then the dragged ones.
  const incoming: Item[] = []
  const removedStacks: Item[] = []
  for (const item of dragged) {
    if (item.kind === 'stack') {
      removedStacks.push(item)
      incoming.push(
        ...sortByPosition(
          live(context.draggedChildren).filter((child) => child.parentId === item.id),
        ),
      )
    } else incoming.push(item)
  }

  let stack: Item
  let existing: Item[]
  const rows: Item[] = []
  if (target.kind === 'stack') {
    stack = target
    existing = sortByPosition(live(context.targetChildren))
  } else {
    stack = makeItem(
      {
        kind: 'stack',
        groupId: target.groupId,
        position: target.position,
        title: '',
        parentId: null,
      },
      clock,
    )
    rows.push(stack)
    existing = [target]
  }

  const reordered = [...existing, ...incoming]
  const keys = generateNKeysBetween(null, null, reordered.length)
  reordered.forEach((item, i) => {
    rows.push(
      touch(item, { groupId: stack.groupId, parentId: stack.id, position: keys[i]! }, clock),
    )
  })
  for (const removed of removedStacks) rows.push(touch(removed, { deletedAt: clock.now }, clock))
  return { ok: true, rows }
}

/** Dissolves a stack: its links take the stack's place in the group. */
export function unstack(
  stack: Item,
  children: readonly Item[],
  groupItems: readonly Item[],
  clock: Clock,
): Item[] {
  const ordered = sortByPosition(live(children))
  const siblings = sortByPosition(live(groupItems).filter((item) => item.parentId === null))
  const index = siblings.findIndex((item) => item.id === stack.id)
  const rest = siblings.filter((item) => item.id !== stack.id)
  const keys = keysAt(rest, index < 0 ? rest.length : index, ordered.length)
  return [
    ...ordered.map((child, i) => touch(child, { parentId: null, position: keys[i]! }, clock)),
    touch(stack, { deletedAt: clock.now }, clock),
  ]
}

/** Copies a group and all its live items (stack children keep pointing at their copied stack). */
export function duplicateGroup(
  group: Group,
  items: readonly Item[],
  position: string,
  clock: Clock,
  titleSuffix = '',
): { group: Group; items: Item[] } {
  const copy: Group = {
    ...group,
    id: newId(),
    position,
    title: group.title + titleSuffix,
    createdAt: clock.now,
    updatedAt: clock.now,
    deletedAt: null,
  }
  const idMap = new Map<string, string>()
  for (const item of live(items)) idMap.set(item.id, newId())
  const copied = live(items).map((item) => ({
    ...item,
    id: idMap.get(item.id)!,
    groupId: copy.id,
    parentId: item.parentId ? (idMap.get(item.parentId) ?? null) : null,
    createdAt: clock.now,
    updatedAt: clock.now,
  }))
  return { group: copy, items: copied }
}

export type SortMode = 'title' | 'newest' | 'oldest'

/** Re-orders the top-level items of a group. */
export function sortItems(
  items: readonly Item[],
  mode: SortMode,
  clock: Clock,
  locale = 'en',
): Item[] {
  const top = live(items).filter((item) => item.parentId === null)
  const label = (item: Item) =>
    (item.title || item.text || item.url || '').toLocaleLowerCase(locale)
  const sorted = [...top].sort((a, b) => {
    if (mode === 'title') return label(a).localeCompare(label(b), locale)
    if (mode === 'newest') return b.createdAt - a.createdAt
    return a.createdAt - b.createdAt
  })
  const keys = generateNKeysBetween(null, null, sorted.length)
  return sorted.map((item, i) => touch(item, { position: keys[i]! }, clock))
}

export function softDelete<T extends { updatedAt: number; deletedAt: number | null }>(
  rows: readonly T[],
  clock: Clock,
): T[] {
  return rows.map((row) => touch(row, { deletedAt: clock.now } as Partial<T>, clock))
}

export function restore<T extends { updatedAt: number; deletedAt: number | null }>(
  rows: readonly T[],
  clock: Clock,
): T[] {
  return rows.map((row) => touch(row, { deletedAt: null } as Partial<T>, clock))
}

export interface ItemCounts {
  links: number
  notes: number
  tasks: number
  done: number
}

/** Counts for a group's header pill (stack children count as links). */
export function countItems(items: readonly Item[]): ItemCounts {
  const counts: ItemCounts = { links: 0, notes: 0, tasks: 0, done: 0 }
  for (const item of live(items)) {
    if (item.kind === 'link' || item.kind === 'image') counts.links++
    else if (item.kind === 'note') {
      if (item.todo) {
        counts.tasks++
        if (item.done) counts.done++
      } else counts.notes++
    }
  }
  return counts
}
