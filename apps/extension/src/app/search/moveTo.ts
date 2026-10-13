import { INBOX_ID } from '@tabcabin/core'
import { toast } from '@tabcabin/ui'
import * as repo from '@/db/repo'
import type { SearchDoc } from '@/db/search'
import { countClosedTabs } from '@/db/stats'
import type { Translate } from '@/i18n'
import { useUi } from '@/state/ui'
import { offerUndo } from '@/state/undo'
import type { BoardActions } from '../board/actions'
import type { GroupTarget } from './useGroupTargets'

/** Open tabs and saved items can be moved into a group from search. */
export const canMove = (doc: SearchDoc) =>
  doc.kind === 'tab' || (doc.rowId !== undefined && doc.kind !== 'bookmark')

async function ready(target: GroupTarget, t: Translate) {
  if (target.id === INBOX_ID) await repo.ensureInbox(t('inbox.title'))
}

/**
 * Moves a search result into a group: an open tab is saved there and closed, a saved item
 * leaves its group (with undo).
 */
export async function moveTo(doc: SearchDoc, target: GroupTarget, t: Translate) {
  await ready(target, t)
  const title = t('search.movedTo', { group: target.label })
  if (doc.kind === 'tab' && doc.url && doc.tabId !== undefined) {
    const { ids } = await repo.addLinks(target.id, [
      { url: doc.url, title: doc.title, favIconUrl: doc.favIconUrl ?? null },
    ])
    await browser.tabs.remove(doc.tabId).catch(() => undefined)
    await countClosedTabs(1)
    toast({ title, tone: 'success', action: showAction(ids[0], t) })
    return
  }
  if (!doc.rowId) return
  const result = await repo.moveItemsTo([doc.rowId], { groupId: target.id, index: 1_000_000 })
  offerUndo(result, { title, undoLabel: t('common.undo') })
}

/** Adds what was typed in search to a group: a link when it is an address, a note otherwise. */
export async function addTo(
  text: string,
  target: GroupTarget,
  actions: BoardActions,
  t: Translate,
) {
  await ready(target, t)
  await actions.addFromText(target.id, text)
  toast({ title: t('search.addedTo', { group: target.label }), tone: 'success' })
}

function showAction(itemId: string | undefined, t: Translate) {
  if (!itemId) return undefined
  return { label: t('duplicate.show'), onClick: () => useUi.getState().flashItem(itemId) }
}
