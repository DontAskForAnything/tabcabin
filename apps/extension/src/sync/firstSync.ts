import { ENTITY_TYPES } from '@tabcabin/core'
import { ownDeviceId } from '@/db/activity/device'
import { db } from '@/db/db'
import type { SyncClient } from './client'
import { pullAll } from './pull'
import { pushAll } from './push'
import { entityTables, table } from './rows'
import { updateSyncState } from './state'

export type FirstSyncMode = 'merge' | 'server'

/** Queues every local row, so a first sync uploads what this browser already has. */
async function enqueueEverything() {
  const now = Date.now()
  await db.transaction('rw', [...entityTables(), db.outbox], async () => {
    for (const entity of ENTITY_TYPES) {
      const keys = (await table(entity).toCollection().primaryKeys()) as string[]
      await db.outbox.bulkPut(
        keys.map((id) => ({ entity, id, type: 'put' as const, queuedAt: now })),
      )
    }
  })
}

/**
 * Drops local boards (keeps settings) before downloading the server's copy. This browser's own
 * activity stays and joins the account's.
 */
async function clearLocalData() {
  await db.transaction('rw', [...entityTables(), db.outbox], async () => {
    const boards = ENTITY_TYPES.filter((entity) => entity !== 'activity')
    await Promise.all([...boards.map((entity) => table(entity).clear()), db.outbox.clear()])
    const own = await db.activity.toCollection().primaryKeys()
    await db.outbox.bulkPut(
      own.map((id) => ({
        entity: 'activity' as const,
        id,
        type: 'put' as const,
        queuedAt: Date.now(),
      })),
    )
  })
}

/** Activity rows of other computers belong to an account this browser was signed in to before. */
async function forgetOtherComputers() {
  const own = await ownDeviceId()
  await db.activity.filter((row) => row.id !== own).delete()
}

/** Whether this browser has boards of its own (the first sync then asks what to keep). */
export async function localHasData(): Promise<boolean> {
  return (await db.workspaces.filter((ws) => ws.deletedAt === null).count()) > 0
}

/**
 * First synchronization after signing in. `merge` uploads this browser's data and downloads
 * the server's; `server` replaces local data with the server's copy.
 */
export async function firstSync(client: SyncClient, mode: FirstSyncMode) {
  await updateSyncState({ status: 'syncing', lastSeq: 0, error: null })
  await forgetOtherComputers()
  if (mode === 'server') await clearLocalData()
  else await enqueueEverything()
  await pushAll(client)
  await pullAll(client)
  await updateSyncState({ status: 'synced', lastSyncAt: Date.now() })
}
