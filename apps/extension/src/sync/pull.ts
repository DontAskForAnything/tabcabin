import { isEntityType, syncSchemas } from '@tabcabin/core'
import { db } from '@/db/db'
import type { RemoteChange, SyncClient } from './client'
import { entityTables, type Row, table } from './rows'
import { getSyncState } from './state'

/**
 * Writes rows that came from the server without queuing them again. A local row with a
 * pending, newer change is kept (it will be pushed and win on the server). Kinds of rows from a
 * newer version are skipped, and fields this version does not know are kept with the row, so
 * editing it here does not drop them on the other computers.
 */
async function applyRemote(changes: RemoteChange[], seq: number) {
  await db.transaction('rw', [...entityTables(), db.outbox, db.meta], async () => {
    for (const change of changes) {
      if (!isEntityType(change.entity)) continue
      const t = table(change.entity)
      const local = await t.get(change.id)
      const pending = await db.outbox.get([change.entity, change.id])
      if (pending && local && local.updatedAt > change.updatedAt) continue
      if (change.row === null) {
        await t.delete(change.id)
      } else {
        const parsed = syncSchemas[change.entity].safeParse(change.row)
        if (!parsed.success) continue
        await t.put(parsed.data as Row)
      }
      if (pending) await db.outbox.delete([change.entity, change.id])
    }
    const state = await getSyncState()
    await db.meta.put({
      key: 'sync.state',
      value: { ...state, lastSeq: Math.max(state.lastSeq, seq) },
    })
  })
}

/** Downloads and applies everything the server has after the last seen change. */
export async function pullAll(client: SyncClient) {
  for (;;) {
    const { lastSeq } = await getSyncState()
    const page = await client.pull(lastSeq)
    if (page.changes.length) await applyRemote(page.changes, page.seq)
    if (!page.more) return
  }
}
