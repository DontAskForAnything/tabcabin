import { db, type OutboxEntry } from '@/db/db'
import type { PushChange, SyncClient } from './client'
import { table } from './rows'

/** The oldest queued local changes, with the current version of each row. */
async function collectPush(
  limit = 500,
): Promise<{ entries: OutboxEntry[]; changes: PushChange[] }> {
  const entries = await db.outbox.orderBy('queuedAt').limit(limit).toArray()
  const changes: PushChange[] = []
  for (const entry of entries) {
    const row = entry.type === 'put' ? await table(entry.entity).get(entry.id) : undefined
    changes.push(
      row
        ? { type: 'put', entity: entry.entity, row }
        : { type: 'purge', entity: entry.entity, id: entry.id, at: entry.queuedAt },
    )
  }
  return { entries, changes }
}

/** Removes sent outbox entries unless the row changed again in the meantime. */
async function acknowledge(entries: OutboxEntry[]) {
  await db.transaction('rw', db.outbox, async () => {
    for (const entry of entries) {
      const current = await db.outbox.get([entry.entity, entry.id])
      if (current && current.queuedAt === entry.queuedAt)
        await db.outbox.delete([entry.entity, entry.id])
    }
  })
}

/** Sends every queued local change, oldest first. */
export async function pushAll(client: SyncClient) {
  for (;;) {
    const { entries, changes } = await collectPush()
    if (entries.length === 0) return
    await client.push(changes)
    await acknowledge(entries)
    if (entries.length < 500) return
  }
}
