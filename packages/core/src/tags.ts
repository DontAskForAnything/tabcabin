import { type Clock, makeTag } from './factories'
import { positionsAtEnd } from './position'
import { type Item, NOTE_COLORS, type NoteColor, type Tag } from './schema'

/** How far tags go; change them here. */
export const TAG_LIMITS = {
  /** Tags one account can have. */
  perAccount: 25,
  /** Tags on one item. */
  perItem: 5,
  /** Letters in a tag's name. */
  nameLength: 24,
} as const

/** A name as people type it, tidied: no leading #, single spaces, not too long. */
export function tagName(raw: string): string {
  return raw
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, TAG_LIMITS.nameLength)
    .trim()
}

/** Tags are the same when their names only differ in case. */
export function findTag(tags: readonly Tag[], name: string): Tag | undefined {
  const wanted = tagName(name).toLocaleLowerCase()
  return tags.find((tag) => tag.name.toLocaleLowerCase() === wanted)
}

/** The first colour no tag has yet, then round again. */
export function nextTagColor(tags: readonly Pick<Tag, 'color'>[]): NoteColor {
  const used = new Set(tags.map((tag) => tag.color))
  return NOTE_COLORS.find((color) => !used.has(color)) ?? NOTE_COLORS[tags.length % 9]!
}

export function sortTags(tags: readonly Tag[]): Tag[] {
  return [...tags].sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0))
}

export type NewTagResult =
  { ok: true; tag: Tag; created: boolean } | { ok: false; error: 'full' | 'empty' }

/** The tag with this name, or a new one after the others (with the next colour). */
export function tagNamed(tags: readonly Tag[], raw: string, clock: Clock): NewTagResult {
  const name = tagName(raw)
  if (!name) return { ok: false, error: 'empty' }
  const found = findTag(tags, name)
  if (found) return { ok: true, tag: found, created: false }
  if (tags.length >= TAG_LIMITS.perAccount) return { ok: false, error: 'full' }
  const [position] = positionsAtEnd(sortTags(tags), 1)
  const tag = makeTag({ name, color: nextTagColor(tags), position: position! }, clock)
  return { ok: true, tag, created: true }
}

/** The item's tags that still exist, in the item's order. */
export function itemTagIds(item: Pick<Item, 'tagIds'>, live: ReadonlySet<string>): string[] {
  return (item.tagIds ?? []).filter((id) => live.has(id))
}

/**
 * New tag lists for items getting (or losing) a tag. Tags that no longer exist are dropped on the
 * way; an item that already has as many tags as it can is left out (`full`).
 */
export function tagItems(
  items: readonly Item[],
  tagId: string,
  on: boolean,
  live: ReadonlySet<string>,
): { changed: { item: Item; tagIds: string[] }[]; full: Item[] } {
  const changed: { item: Item; tagIds: string[] }[] = []
  const full: Item[] = []
  for (const item of items) {
    const current = itemTagIds(item, live)
    const has = current.includes(tagId)
    if (on === has) continue
    if (on && current.length >= TAG_LIMITS.perItem) {
      full.push(item)
      continue
    }
    changed.push({ item, tagIds: on ? [...current, tagId] : current.filter((id) => id !== tagId) })
  }
  return { changed, full }
}

/** Whether an item has one of the tags; a stack also counts the links inside it. */
export function hasAnyTag(
  item: Pick<Item, 'tagIds'>,
  tagIds: ReadonlySet<string>,
  children: readonly Pick<Item, 'tagIds'>[] = [],
): boolean {
  const hit = (row: Pick<Item, 'tagIds'>) => (row.tagIds ?? []).some((id) => tagIds.has(id))
  return hit(item) || children.some(hit)
}

/**
 * Brings imported tags into an account: a tag whose name is already there becomes that tag, the
 * others are added while there is room. `ids` maps every imported tag id that has a home.
 */
export function mergeTags(
  imported: readonly Tag[],
  existing: readonly Tag[],
  clock: Clock,
): { added: Tag[]; ids: Map<string, string> } {
  const ids = new Map<string, string>()
  const added: Tag[] = []
  let all = [...existing]
  for (const tag of sortTags(imported)) {
    const result = tagNamed(all, tag.name, clock)
    if (!result.ok) continue
    ids.set(tag.id, result.tag.id)
    if (result.created) {
      const kept = { ...result.tag, color: tag.color }
      added.push(kept)
      all = [...all, kept]
    }
  }
  return { added, ids }
}
