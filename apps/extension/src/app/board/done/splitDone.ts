import type { Item } from '@tabcabin/core'
import type { DonePhase } from './justDone'

/** A to-do that is ticked off. Only notes are to-dos. */
const isFinished = (item: Pick<Item, 'kind' | 'todo' | 'done'>) =>
  item.kind === 'note' && item.todo && item.done

/**
 * The items a list shows and the finished to-dos that fold away below it. A to-do ticked off a
 * moment ago stays in the list until its animation ends (`landing`).
 */
export function splitDone<T extends Pick<Item, 'id' | 'kind' | 'todo' | 'done'>>(
  items: readonly T[],
  phases: Readonly<Record<string, DonePhase>>,
): { open: T[]; done: T[]; landing: boolean } {
  const open: T[] = []
  const done: T[] = []
  let landing = false
  for (const item of items) {
    if (!isFinished(item)) open.push(item)
    else if (phases[item.id]) {
      open.push(item)
      landing = true
    } else done.push(item)
  }
  return { open, done, landing }
}
