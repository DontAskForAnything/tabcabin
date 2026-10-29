import {
  detachLinkText as detach,
  type Item,
  makeNote,
  positionAtEnd,
  put,
  puts,
  unpinNotes as unpin,
} from '@tabcabin/core'
import { db } from '../db'
import { clock, commit, mustGet } from './commit'
import { descendantsOf, getGroupItems } from './reads'

/** A new, empty note pinned to the end of a link's notes. */
export async function addPinnedNote(linkId: string, input: Partial<Pick<Item, 'todo'>> = {}) {
  const link = await mustGet('item', linkId)
  const note = {
    ...makeNote(
      {
        groupId: link.groupId,
        position: positionAtEnd(await descendantsOf([link.id], 1)),
        ...input,
      },
      clock(),
    ),
    parentId: link.id,
  }
  return { ...(await commit([put('item', note)])), id: note.id }
}

/** Takes notes off their link; they go into the group right below it. */
export async function unpinNotes(ids: readonly string[]) {
  const notes = (await db.items.bulkGet([...ids])).filter(
    (item): item is Item => !!item && item.kind === 'note' && item.parentId !== null,
  )
  if (!notes[0]) return { undo: [] }
  return commit(puts('item', unpin(notes, await getGroupItems(notes[0].groupId), clock())))
}

/**
 * Turns the note written on a link itself into a pinned note of its own (it looks the same) and
 * returns that note's id, or null when the link has no note.
 */
export async function detachLinkText(linkId: string): Promise<string | null> {
  const link = await mustGet('item', linkId)
  const detached = detach(link, await descendantsOf([link.id], 1), clock())
  if (!detached) return null
  await commit(puts('item', detached.rows))
  return detached.note.id
}
