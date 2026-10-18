import { newId } from '@tabcabin/core'
import { db } from '../db'

/** Names this browser's own activity row; a fresh install (or removing everything) gets a new one. */
export const DEVICE_KEY = 'activity.device'

/** The id of this browser's activity row. Call it inside a transaction that writes `db.meta`. */
export async function deviceId(): Promise<string> {
  const stored = (await db.meta.get(DEVICE_KEY))?.value
  if (typeof stored === 'string') return stored
  const id = newId()
  await db.meta.put({ key: DEVICE_KEY, value: id })
  return id
}

/** The id of this browser's activity row, if it has counted anything yet. */
export async function ownDeviceId(): Promise<string | null> {
  const stored = (await db.meta.get(DEVICE_KEY))?.value
  return typeof stored === 'string' ? stored : null
}
