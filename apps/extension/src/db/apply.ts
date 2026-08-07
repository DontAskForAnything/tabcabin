import type { Change, EntityMap, EntityType } from '@tabhangar/core'
import type { Table } from 'dexie'
import { db, tables } from './db'

type AnyTable = Table<{ id: string }, string>

const entityTables = () => [
  db.workspaces,
  db.categories,
  db.groups,
  db.items,
  db.reminders,
  db.outbox,
]

/**
 * Writes a change set atomically and queues it for sync.
 * `bump` re-stamps rows with the current time (used when re-applying old rows, e.g. undo).
 */
export async function applyChanges(changes: readonly Change[], options: { bump?: boolean } = {}) {
  if (changes.length === 0) return
  const now = Date.now()
  await db.transaction('rw', entityTables(), async () => {
    for (const change of changes) {
      const table = tables[change.entity]() as unknown as AnyTable
      if (change.type === 'put') {
        const row = options.bump ? { ...change.row, updatedAt: now } : change.row
        await table.put(row)
        await db.outbox.put({ entity: change.entity, id: row.id, type: 'put', queuedAt: now })
      } else {
        await table.delete(change.id)
        await db.outbox.put({ entity: change.entity, id: change.id, type: 'purge', queuedAt: now })
      }
    }
  })
}

/** Current rows for the given ids (missing ids are skipped). */
export async function loadRows<E extends EntityType>(
  entity: E,
  ids: readonly string[],
): Promise<EntityMap[E][]> {
  const table = tables[entity]() as unknown as Table<EntityMap[E], string>
  const rows = await table.bulkGet([...ids])
  return rows.filter((row): row is EntityMap[E] => row !== undefined)
}

export async function loadRow<E extends EntityType>(
  entity: E,
  id: string,
): Promise<EntityMap[E] | undefined> {
  const table = tables[entity]() as unknown as Table<EntityMap[E], string>
  return table.get(id)
}
