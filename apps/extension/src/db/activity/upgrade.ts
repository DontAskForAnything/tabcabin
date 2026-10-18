import { newId } from '@tabcabin/core'
import type { Transaction } from 'dexie'
import { DEVICE_KEY } from './device'

/** Where closed tabs were counted before (this browser only, never synced). */
const OLD_CLOSED_TABS = 'stats.closedTabs'

/** Moves the closed tabs counted before this browser's activity row existed into that row. */
export async function moveClosedTabs(tx: Transaction) {
  const old = (await tx.table('meta').get(OLD_CLOSED_TABS)) as
    { value: Record<string, number> } | undefined
  if (!old) return
  const id = newId()
  const now = Date.now()
  const days = Object.fromEntries(
    Object.entries(old.value).map(([day, closed]) => [day, { closed, saved: 0, done: 0 }]),
  )
  await tx.table('meta').put({ key: DEVICE_KEY, value: id })
  await tx.table('activity').put({ id, createdAt: now, updatedAt: now, deletedAt: null, days })
  await tx.table('outbox').put({ entity: 'activity', id, type: 'put', queuedAt: now })
  await tx.table('meta').delete(OLD_CLOSED_TABS)
}
