import { type Clock, makeGroup } from './factories'
import type { Group } from './schema'

/**
 * The Inbox: one group outside every workspace for things saved without picking a group. The
 * group and the category it points to share a fixed id, so every copy of the extension (and every
 * synced computer) makes the same group instead of one each. No category has this id, so versions
 * that do not know the Inbox leave it out of their boards.
 */
export const INBOX_ID = 'inbox'
export const INBOX_EMOJI = '📬'

export function makeInbox(title: string, clock: Clock): Group {
  return makeGroup(
    { id: INBOX_ID, categoryId: INBOX_ID, position: 'a0', title, emoji: INBOX_EMOJI },
    clock,
  )
}
