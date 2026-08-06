import type { EntityMap, EntityType } from './schema'

/** A full row written to storage (soft deletes are puts with `deletedAt`). */
export interface PutChange<E extends EntityType = EntityType> {
  type: 'put'
  entity: E
  row: EntityMap[E]
}

/** Permanent removal (emptying the bin). */
export interface PurgeChange<E extends EntityType = EntityType> {
  type: 'purge'
  entity: E
  id: string
}

export type Change = PutChange | PurgeChange

export function put<E extends EntityType>(entity: E, row: EntityMap[E]): PutChange<E> {
  return { type: 'put', entity, row }
}

export function purge<E extends EntityType>(entity: E, id: string): PurgeChange<E> {
  return { type: 'purge', entity, id }
}

export function puts<E extends EntityType>(
  entity: E,
  rows: readonly EntityMap[E][],
): PutChange<E>[] {
  return rows.map((row) => put(entity, row))
}
