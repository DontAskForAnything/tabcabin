import { generateKeyBetween, generateNKeysBetween } from 'fractional-indexing'

export interface Positioned {
  position: string
}

export function byPosition<T extends Positioned>(a: T, b: T): number {
  if (a.position < b.position) return -1
  if (a.position > b.position) return 1
  return 0
}

export function sortByPosition<T extends Positioned>(list: readonly T[]): T[] {
  return [...list].sort(byPosition)
}

/** Position key strictly between `before` and `after` (either may be null for the list ends). */
export function positionBetween(before: string | null, after: string | null): string {
  return generateKeyBetween(before, after)
}

/** Position for appending to the end of an (unsorted) list. */
export function positionAtEnd(list: readonly Positioned[]): string {
  const last = list.reduce<string | null>(
    (max, entry) => (max === null || entry.position > max ? entry.position : max),
    null,
  )
  return generateKeyBetween(last, null)
}

export function positionAtStart(list: readonly Positioned[]): string {
  const first = list.reduce<string | null>(
    (min, entry) => (min === null || entry.position < min ? entry.position : min),
    null,
  )
  return generateKeyBetween(null, first)
}

/**
 * Position for inserting at `index` of a list that is already sorted by position.
 * `index` may equal `sorted.length` to append.
 */
export function positionAtIndex(sorted: readonly Positioned[], index: number): string {
  const clamped = Math.max(0, Math.min(index, sorted.length))
  const before = clamped > 0 ? (sorted[clamped - 1]?.position ?? null) : null
  const after = clamped < sorted.length ? (sorted[clamped]?.position ?? null) : null
  return generateKeyBetween(before, after)
}

export function positionsAtEnd(list: readonly Positioned[], count: number): string[] {
  const last = list.reduce<string | null>(
    (max, entry) => (max === null || entry.position > max ? entry.position : max),
    null,
  )
  return generateNKeysBetween(last, null, count)
}
