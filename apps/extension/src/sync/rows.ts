import { type EntityType, ENTITY_TYPES } from '@tabhangar/core'
import type { Table } from 'dexie'
import { tables } from '@/db/db'

/** What sync needs to know about any local row. */
export type Row = { id: string; updatedAt: number }

export const table = (entity: EntityType) => tables[entity]() as unknown as Table<Row, string>
export const entityTables = () => ENTITY_TYPES.map((entity) => tables[entity]())
