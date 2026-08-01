import { describe, expect, it } from 'vitest'
import {
  positionAtEnd,
  positionAtIndex,
  positionAtStart,
  positionBetween,
  positionsAtEnd,
  sortByPosition,
} from './position'

const list = (...positions: string[]) => positions.map((position) => ({ position }))

describe('position helpers', () => {
  it('creates keys between neighbours', () => {
    const a = positionBetween(null, null)
    const b = positionBetween(a, null)
    const mid = positionBetween(a, b)
    expect(a < mid && mid < b).toBe(true)
  })

  it('appends and prepends regardless of input order', () => {
    const items = list('a1', 'a0', 'a2')
    expect(positionAtEnd(items) > 'a2').toBe(true)
    expect(positionAtStart(items) < 'a0').toBe(true)
    expect(positionAtEnd([])).toBe(positionBetween(null, null))
  })

  it('inserts at an index of a sorted list', () => {
    const sorted = sortByPosition(list('a2', 'a0', 'a1'))
    const key = positionAtIndex(sorted, 1)
    expect(key > 'a0' && key < 'a1').toBe(true)
    expect(positionAtIndex(sorted, 99) > 'a2').toBe(true)
    expect(positionAtIndex(sorted, -5) < 'a0').toBe(true)
  })

  it('generates several ordered keys', () => {
    const keys = positionsAtEnd(list('a0'), 3)
    expect(keys).toHaveLength(3)
    expect([...keys].sort()).toEqual(keys)
    expect(keys[0]! > 'a0').toBe(true)
  })
})
