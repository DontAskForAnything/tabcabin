import { displayHost, NOTE_MAX_LENGTH } from '@tabhangar/core'
import * as repo from '@/db/repo'
import { loadRow } from '@/db/apply'
import { randomEmoji } from '@/lib/emoji'

export type SaveTarget = { groupId: string } | { newGroupIn: string; title: string }

async function resolveGroup(
  target: SaveTarget,
): Promise<{ groupId: string; created: repo.Result | null }> {
  if ('groupId' in target) return { groupId: target.groupId, created: null }
  const result = await repo.createGroup(target.newGroupIn, {
    title: target.title.slice(0, 60),
    emoji: randomEmoji(),
  })
  return { groupId: result.groupId, created: result }
}

/** Saves something into a group; returns the group title and a combined undo. */
export async function saveToGroup(
  target: SaveTarget,
  what:
    | {
        kind: 'link'
        url: string
        title: string
        favIconUrl: string | null
        note?: { text: string; color: string | null; todo: boolean } | null
      }
    | { kind: 'note'; text: string; sourceUrl: string; title: string }
    | { kind: 'image'; imageUrl: string; title: string; pageUrl: string },
): Promise<{ groupTitle: string; result: repo.Result; itemId: string | null }> {
  const { groupId, created } = await resolveGroup(target)
  let result: repo.Result
  let itemId: string | null = null
  if (what.kind === 'link') {
    const added = await repo.addLinks(groupId, [
      { url: what.url, title: what.title || displayHost(what.url), favIconUrl: what.favIconUrl },
    ])
    result = added
    itemId = added.ids[0] ?? null
    const note = what.note
    if (note && note.text.trim() && added.ids[0]) {
      if (note.todo) {
        const extra = await repo.addNote(
          groupId,
          {
            text: note.text.slice(0, NOTE_MAX_LENGTH),
            todo: true,
            color: (note.color as never) ?? null,
          },
          { afterId: added.ids[0] },
        )
        itemId = extra.id
        result = { undo: [...extra.undo, ...result.undo] }
      } else {
        const edit = await repo.updateItem(added.ids[0], {
          text: note.text.slice(0, NOTE_MAX_LENGTH),
          color: (note.color as never) ?? null,
        })
        result = { undo: [...edit.undo, ...result.undo] }
      }
    }
  } else if (what.kind === 'note') {
    const added = await repo.addNote(groupId, {
      text: what.text.slice(0, NOTE_MAX_LENGTH),
      sourceUrl: what.sourceUrl,
      title: what.title,
    })
    result = added
    itemId = added.id
  } else {
    result = await repo.addImage(groupId, {
      imageUrl: what.imageUrl,
      title: what.title,
      url: what.pageUrl,
    })
  }
  if (created) result = { undo: [...result.undo, ...created.undo] }
  const saved = await loadRow('group', groupId)
  return { groupTitle: saved ? `${saved.emoji} ${saved.title}`.trim() : '', result, itemId }
}
