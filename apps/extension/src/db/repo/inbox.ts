import { INBOX_ID, makeInbox, put, touch } from '@tabcabin/core'
import { applyChanges, loadRow } from '../apply'
import { clock } from './commit'

/**
 * Makes the Inbox group when something is first saved there. It is not part of the undo of that
 * save: once made, the Inbox stays (it only shows on the board while it holds something).
 */
export async function ensureInbox(title: string) {
  const row = await loadRow('group', INBOX_ID)
  if (row?.deletedAt === null) return
  const c = clock()
  await applyChanges([put('group', row ? touch(row, { deletedAt: null }, c) : makeInbox(title, c))])
}
