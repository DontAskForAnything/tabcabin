import {
  findTag,
  type Item,
  type NoteColor,
  put,
  puts,
  sortTags,
  type Tag,
  tagItems,
  tagName,
  tagNamed,
  touch,
} from '@tabcabin/core'
import { db } from '../db'
import { clock, commit, live, mustGet, type Result } from './commit'

/** The account's tags in their order. */
export async function getTags(): Promise<Tag[]> {
  return sortTags(live(await db.tags.toArray()))
}

export type TagError = 'full' | 'empty' | 'taken'

/**
 * Puts a tag on items, or takes it off. Items that already have as many tags as they can keep
 * theirs: `full` says how many.
 */
export async function setItemsTag(
  ids: readonly string[],
  tagId: string,
  on: boolean,
): Promise<Result & { full: number }> {
  const c = clock()
  const items = (await db.items.bulkGet([...ids])).filter((item): item is Item => !!item)
  const tags = new Set((await getTags()).map((tag) => tag.id))
  const { changed, full } = tagItems(items, tagId, on, tags)
  const result = await commit(
    puts(
      'item',
      changed.map(({ item, tagIds }) => touch(item, { tagIds }, c)),
    ),
  )
  return { ...result, full: full.length }
}

/** Puts the tag with this name on items, making the tag first when there is none yet. */
export async function tagItemsByName(
  ids: readonly string[],
  name: string,
): Promise<(Result & { ok: true; tag: Tag; full: number }) | { ok: false; error: TagError }> {
  const found = tagNamed(await getTags(), name, clock())
  if (!found.ok) return found
  const made = found.created ? await commit([put('tag', found.tag)]) : { undo: [] }
  const tagged = await setItemsTag(ids, found.tag.id, true)
  return { ok: true, tag: found.tag, full: tagged.full, undo: [...tagged.undo, ...made.undo] }
}

/** Renames a tag or gives it another colour. */
export async function updateTag(
  id: string,
  patch: { name?: string; color?: NoteColor },
): Promise<(Result & { ok: true }) | { ok: false; error: TagError }> {
  const tag = await mustGet('tag', id)
  const next: Partial<Tag> = {}
  if (patch.color) next.color = patch.color
  if (patch.name !== undefined) {
    const name = tagName(patch.name)
    if (!name) return { ok: false, error: 'empty' }
    const other = findTag(await getTags(), name)
    if (other && other.id !== id) return { ok: false, error: 'taken' }
    next.name = name
  }
  return { ok: true, ...(await commit([put('tag', touch(tag, next, clock()))])) }
}

/**
 * Removes a tag. Items keep its id until they are tagged again (a removed tag shows nowhere), so
 * undo brings it back on all of them.
 */
export async function deleteTag(id: string): Promise<Result> {
  const c = clock()
  const tag = await mustGet('tag', id)
  return commit([put('tag', touch(tag, { deletedAt: c.now }, c))])
}

/**
 * The ids of tags named in a form, making the ones the account does not have yet (while it has
 * room); names that found no place are left out.
 */
export async function tagIdsFor(names: readonly string[]): Promise<Result & { ids: string[] }> {
  const ids: string[] = []
  const undo: Result['undo'] = []
  for (const name of names) {
    const found = tagNamed(await getTags(), name, clock())
    if (!found.ok) continue
    if (found.created) undo.unshift(...(await commit([put('tag', found.tag)])).undo)
    if (!ids.includes(found.tag.id)) ids.push(found.tag.id)
  }
  return { undo, ids }
}
