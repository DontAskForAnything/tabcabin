import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'
import { type Clock, makeNote, touch } from './factories'
import { sortByPosition } from './position'
import type { Item, ItemKind } from './schema'

const live = <T extends { deletedAt: number | null }>(rows: readonly T[]) =>
  rows.filter((row) => row.deletedAt === null)

/** What can live inside an item: links in a stack, notes pinned to a link. */
export function canNest(parentKind: ItemKind, childKind: ItemKind): boolean {
  if (parentKind === 'stack') return childKind === 'link'
  if (parentKind === 'link') return childKind === 'note'
  return false
}

/**
 * Pins notes to a link, after the ones it has. Each stays a note of its own (text, colour,
 * to-do), so a link can hold several and each can be taken off again.
 */
export function pinNotes(
  notes: readonly Item[],
  link: Item,
  pinned: readonly Item[],
  clock: Clock,
): Item[] {
  const moving = new Set(notes.map((note) => note.id))
  const last = sortByPosition(live(pinned).filter((note) => !moving.has(note.id))).at(-1)
  const keys = generateNKeysBetween(last?.position ?? null, null, notes.length)
  return notes.map((note, i) =>
    touch(note, { groupId: link.groupId, parentId: link.id, position: keys[i]! }, clock),
  )
}

/**
 * Takes notes off their link: they go back into the group right below it (below its stack when
 * the link is in one).
 */
export function unpinNotes(notes: readonly Item[], groupItems: readonly Item[], clock: Clock) {
  const items = live(groupItems)
  const byId = new Map(items.map((item) => [item.id, item]))
  const moving = new Set(notes.map((note) => note.id))
  const link = byId.get(notes[0]?.parentId ?? '')
  const anchor = link?.parentId ? byId.get(link.parentId) : link
  const top = sortByPosition(items.filter((item) => item.parentId === null && !moving.has(item.id)))
  const at = anchor ? top.findIndex((item) => item.id === anchor.id) : -1
  const before = at >= 0 ? top[at]! : top.at(-1)
  const after = at >= 0 ? top[at + 1] : undefined
  const keys = generateNKeysBetween(before?.position ?? null, after?.position ?? null, notes.length)
  return notes.map((note, i) =>
    touch(
      note,
      { groupId: anchor?.groupId ?? note.groupId, parentId: null, position: keys[i]! },
      clock,
    ),
  )
}

/**
 * The note written on a link itself (in its editor, the save popover or an import) becomes a
 * pinned note of its own, first among the others, so it can be edited, moved and taken off like
 * them. Returns null when the link has no note.
 */
export function detachLinkText(
  link: Item,
  pinned: readonly Item[],
  clock: Clock,
): { note: Item; rows: Item[] } | null {
  if (!link.text.trim()) return null
  const first = sortByPosition(live(pinned))[0]
  const note = {
    ...makeNote(
      {
        groupId: link.groupId,
        position: generateKeyBetween(null, first?.position ?? null),
        text: link.text,
        todo: link.todo,
        done: link.done,
        // A link's own note shows sky blue when it has no colour of its own.
        color: link.color ?? 'sky',
      },
      clock,
    ),
    parentId: link.id,
  }
  return {
    note,
    rows: [note, touch(link, { text: '', todo: false, done: false, color: null }, clock)],
  }
}
