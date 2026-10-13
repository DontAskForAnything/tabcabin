import { INBOX_ID } from '@tabcabin/core'
import { type BoardGroup, useBoard } from '@/db/hooks'

/** The Inbox while it holds something (undefined when empty or not made yet). */
export function useInbox(): BoardGroup | undefined {
  const inbox = useBoard(INBOX_ID)?.[0]
  return inbox && inbox.items.length > 0 ? inbox : undefined
}
