import { displayHost, INBOX_ID, NOTE_MAX_LENGTH } from '@tabcabin/core'
import { countActivity } from '@/db/activity/count'
import * as repo from '@/db/repo'
import { loadRow } from '@/db/apply'
import { savedElsewhere } from '@/db/duplicates'
import { translate } from '@/i18n/translate'
import { randomEmoji } from '@/lib/emoji'
import { getSettings } from '@/settings/settings'

export type SaveTarget = { groupId: string } | { newGroupIn: string; title: string }

const inboxTitle = async () => translate((await getSettings()).locale, 'inbox.title')

async function resolveGroup(
  target: SaveTarget,
): Promise<{ groupId: string; created: repo.Result | null }> {
  if ('groupId' in target) {
    if (target.groupId === INBOX_ID) await repo.ensureInbox(await inboxTitle())
    return { groupId: target.groupId, created: null }
  }
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
): Promise<{
  groupTitle: string
  result: repo.Result
  itemId: string | null
  /** Another group the link was already saved in (when the warning is on). */
  alsoIn: string | null
  /** Takes the save back, the week's count included. */
  undo: () => Promise<void>
}> {
  const { groupId, created } = await resolveGroup(target)
  let result: repo.Result
  let itemId: string | null = null
  let alsoIn: string | null = null
  let links = 0
  if (what.kind === 'link') {
    if ((await getSettings()).warnDuplicates)
      alsoIn = (await savedElsewhere([what.url], groupId))[0]?.label ?? null
    const added = await repo.addLinks(groupId, [
      { url: what.url, title: what.title || displayHost(what.url), favIconUrl: what.favIconUrl },
    ])
    result = added
    itemId = added.ids[0] ?? null
    links = added.ids.length
    await countActivity({ saved: links })
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
  const title = groupId === INBOX_ID ? await inboxTitle() : saved?.title
  const undo = async () => {
    await repo.revert(result)
    await countActivity({ saved: -links })
  }
  return {
    groupTitle: saved ? `${saved.emoji} ${title}`.trim() : '',
    result,
    itemId,
    alsoIn,
    undo,
  }
}
