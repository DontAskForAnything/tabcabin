import { type Change, type EntityMap, type EntityType, purge, put } from '@tabhangar/core'
import { applyChanges, loadRow } from '../apply'

export interface Result {
  /** Change set that reverts the operation. */
  undo: Change[]
}

export const clock = () => ({ now: Date.now() })
export const live = <T extends { deletedAt: number | null }>(rows: readonly T[]) =>
  rows.filter((row) => row.deletedAt === null)

/** Applies `next` and returns the inverse built from the rows as they were before. */
export async function commit(next: Change[]): Promise<Result> {
  const undo: Change[] = []
  for (const change of next) {
    const id = change.type === 'put' ? change.row.id : change.id
    const previous = await loadRow(change.entity, id)
    undo.unshift(
      previous
        ? put(change.entity, previous as EntityMap[typeof change.entity])
        : purge(change.entity, id),
    )
  }
  await applyChanges(next)
  return { undo }
}

export async function revert(result: Result) {
  await applyChanges(result.undo, { bump: true })
}

export async function mustGet<E extends EntityType>(entity: E, id: string): Promise<EntityMap[E]> {
  const row = await loadRow(entity, id)
  if (!row) throw new Error(`${entity} ${id} not found`)
  return row
}
