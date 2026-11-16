import {
  findTag,
  nextTagColor,
  type NoteColor,
  type Tag,
  TAG_LIMITS,
  tagName,
} from '@tabcabin/core'

/** A tag chosen in a form before it is saved: an existing tag, or one to make on save. */
export interface DraftTag {
  id: string
  name: string
  color: NoteColor
  isNew: boolean
}

export const draftFrom = (tags: readonly Tag[]): DraftTag[] =>
  tags.map((tag) => ({ id: tag.id, name: tag.name, color: tag.color, isNew: false }))

/**
 * Adds a tag by name to a form's choice: the account's tag with that name, or a new one (in the
 * next free colour) while the item and the account have room.
 */
export function addDraftTag(
  draft: readonly DraftTag[],
  tags: readonly Tag[],
  raw: string,
): { ok: true; draft: DraftTag[] } | { ok: false; error: 'empty' | 'item' | 'account' } {
  const name = tagName(raw)
  if (!name) return { ok: false, error: 'empty' }
  const lower = name.toLocaleLowerCase()
  if (draft.some((tag) => tag.name.toLocaleLowerCase() === lower))
    return { ok: true, draft: [...draft] }
  if (draft.length >= TAG_LIMITS.perItem) return { ok: false, error: 'item' }
  const found = findTag(tags, name)
  if (found)
    return {
      ok: true,
      draft: [...draft, { id: found.id, name: found.name, color: found.color, isNew: false }],
    }
  const made = draft.filter((tag) => tag.isNew)
  if (tags.length + made.length >= TAG_LIMITS.perAccount) return { ok: false, error: 'account' }
  const color = nextTagColor([...tags, ...made])
  return { ok: true, draft: [...draft, { id: `new:${lower}`, name, color, isNew: true }] }
}
