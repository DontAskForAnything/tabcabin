import { describe, expect, it } from 'vitest'
import { pickItems } from './pickItems'

const order = ['a', 'b', 'c', 'd', 'e']

describe('picking saved items with Shift', () => {
  it('picks only the clicked item without a start', () => {
    expect(pickItems([], null, 'c', order)).toEqual(['c'])
  })

  it('picks the range from the last Shift-clicked item, either way round', () => {
    expect(pickItems(['b'], 'b', 'd', order)).toEqual(['b', 'c', 'd'])
    expect(pickItems(['d'], 'd', 'a', order)).toEqual(['d', 'a', 'b', 'c'])
  })

  it('keeps the items picked before', () => {
    expect(pickItems(['e', 'a'], 'a', 'b', order)).toEqual(['e', 'a', 'b'])
  })

  it('puts a picked item back', () => {
    expect(pickItems(['a', 'b', 'c'], 'c', 'b', order)).toEqual(['a', 'c'])
  })

  it('picks one item when the start was put back or sits in another list', () => {
    // b was just put back.
    expect(pickItems(['a'], 'b', 'd', order)).toEqual(['a', 'd'])
    expect(pickItems(['x'], 'x', 'c', order)).toEqual(['x', 'c'])
  })
})
