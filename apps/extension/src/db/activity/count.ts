import type { Activity } from '@tabcabin/core'
import { db } from '../db'
import { addToDay, type Counts } from './days'
import { deviceId } from './device'

/**
 * Counts what just happened on this computer (negative numbers take back an undone step). Only
 * this browser's own row changes, so the sync never mixes up two computers' numbers.
 */
export async function countActivity(delta: Partial<Counts>, now = Date.now()) {
  if (!Object.values(delta).some(Boolean)) return
  await db.transaction('rw', [db.activity, db.meta, db.outbox], async () => {
    const id = await deviceId()
    const row: Activity = (await db.activity.get(id)) ?? {
      id,
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      days: {},
    }
    const next: Activity = {
      ...row,
      days: addToDay(row.days, delta, now),
      updatedAt: Math.max(now, row.updatedAt + 1),
    }
    await db.activity.put(next)
    await db.outbox.put({ entity: 'activity', id, type: 'put', queuedAt: now })
  })
}
