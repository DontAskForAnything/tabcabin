import { describe, expect, it } from 'vitest'
import { pickRange, toggleTab } from './tabSelection'

const order = [10, 11, 12, 13, 14]

describe('picking open tabs', () => {
  it('toggles a single tab', () => {
    expect(toggleTab([10], 12)).toEqual([10, 12])
    expect(toggleTab([10, 12], 10)).toEqual([12])
  })

  it('picks the range from the last clicked tab, either way round', () => {
    expect(pickRange([11], 11, 13, order)).toEqual([11, 12, 13])
    expect(pickRange([13], 13, 10, order)).toEqual([13, 10, 11, 12])
  })

  it('keeps the tabs picked before', () => {
    expect(pickRange([14, 11], 11, 12, order)).toEqual([14, 11, 12])
  })

  it('puts the range back when the last clicked tab was put back', () => {
    // 11 was just Ctrl-clicked off.
    expect(pickRange([10, 12, 13], 11, 13, order)).toEqual([10])
  })

  it('picks only the clicked tab without a start, or when the start is hidden', () => {
    expect(pickRange([], null, 12, order)).toEqual([12])
    expect(pickRange([99], 99, 12, order)).toEqual([99, 12])
  })
})
