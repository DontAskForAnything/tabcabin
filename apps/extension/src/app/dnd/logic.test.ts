import { describe, expect, it } from 'vitest'
import {
  canCombine,
  gridIndexFromPointer,
  hoverOnItem,
  indexAmongAll,
  indexAmongRemaining,
  indexFromPointer,
  resolveTarget,
} from './logic'
import type { DragSource } from './types'

const rect = { top: 100, left: 0, width: 300, height: 50 }
const items: DragSource = { kind: 'items', ids: ['a'], groupId: 'g1', parentId: null }

describe('hoverOnItem', () => {
  it('splits an item into before / middle / after', () => {
    expect(hoverOnItem(rect, { x: 10, y: 105 }, true)).toEqual({ position: 'before' })
    expect(hoverOnItem(rect, { x: 10, y: 125 }, true)).toEqual({ position: 'middle' })
    expect(hoverOnItem(rect, { x: 10, y: 146 }, true)).toEqual({ position: 'after' })
    expect(hoverOnItem(rect, { x: 10, y: 125 }, false)).toEqual({ position: 'after' })
  })
})

describe('canCombine', () => {
  it('follows the stacking rules', () => {
    expect(canCombine(['link'], 'link')).toBe(true)
    expect(canCombine(['tab', 'link'], 'stack')).toBe(true)
    expect(canCombine(['note'], 'note')).toBe(true)
    expect(canCombine(['note'], 'link')).toBe(true)
    expect(canCombine(['note', 'link'], 'link')).toBe(false)
    expect(canCombine(['note'], 'stack')).toBe(false)
    expect(canCombine(['link'], 'note')).toBe(false)
    expect(canCombine(['link'], 'image')).toBe(false)
  })
})

describe('indexes', () => {
  it('finds the insertion index from item midpoints', () => {
    const rects = [0, 1, 2].map((i) => ({ top: i * 60, left: 0, width: 100, height: 50 }))
    expect(indexFromPointer(rects, { x: 0, y: 10 })).toBe(0)
    expect(indexFromPointer(rects, { x: 0, y: 40 })).toBe(1)
    expect(indexFromPointer(rects, { x: 0, y: 500 })).toBe(3)
  })

  it('finds the insertion index in a grid', () => {
    const cell = (row: number, col: number) => ({
      top: row * 100,
      left: col * 200,
      width: 180,
      height: 80,
    })
    const rects = [cell(0, 0), cell(0, 1), cell(1, 0)]
    expect(gridIndexFromPointer(rects, { x: 250, y: 40 })).toBe(1)
    expect(gridIndexFromPointer(rects, { x: 350, y: 40 })).toBe(2)
    expect(gridIndexFromPointer(rects, { x: 10, y: 140 })).toBe(2)
    expect(gridIndexFromPointer(rects, { x: 150, y: 140 })).toBe(3)
  })

  it('maps an index over the full list to the remaining items', () => {
    expect(indexAmongRemaining(['a', 'b', 'c', 'd'], new Set(['b']), 3)).toBe(2)
    expect(indexAmongRemaining(['a', 'b', 'c'], new Set(['a']), 0)).toBe(0)
    expect(indexAmongRemaining(['a', 'b'], new Set(), 9)).toBe(2)
  })
})

describe('resolveTarget', () => {
  const base = {
    pointer: { x: 10, y: 125 },
    sourceKinds: ['link'],
    combineArmed: false,
    groupAxis: 'x' as const,
  }

  it('waits before combining and then combines', () => {
    const zone = {
      zone: 'item' as const,
      itemId: 'b',
      groupId: 'g2',
      parentId: null,
      itemKind: 'link',
      index: 2,
      layout: 'list' as const,
    }
    const pending = resolveTarget({ ...base, source: items, zone, zoneRect: rect })
    expect(pending).toMatchObject({ kind: 'combinePending', itemId: 'b' })
    expect(
      resolveTarget({ ...base, source: items, zone, zoneRect: rect, combineArmed: true }),
    ).toEqual({
      kind: 'combine',
      itemId: 'b',
    })
  })

  it('inserts after an item when near its bottom edge', () => {
    const zone = {
      zone: 'item' as const,
      itemId: 'b',
      groupId: 'g2',
      parentId: null,
      itemKind: 'note',
      index: 2,
      layout: 'list' as const,
    }
    expect(
      resolveTarget({ ...base, pointer: { x: 0, y: 148 }, source: items, zone, zoneRect: rect }),
    ).toEqual({
      kind: 'insert',
      groupId: 'g2',
      parentId: null,
      index: 3,
    })
  })

  it('ignores the dragged item itself and zones the source cannot use', () => {
    const self = {
      zone: 'item' as const,
      itemId: 'a',
      groupId: 'g1',
      parentId: null,
      itemKind: 'link',
      index: 0,
      layout: 'list' as const,
    }
    expect(resolveTarget({ ...base, source: items, zone: self, zoneRect: rect })).toBeNull()
    const tabs: DragSource = { kind: 'tabs', tabIds: [1], tabs: [] }
    expect(
      resolveTarget({ ...base, source: tabs, zone: { zone: 'trash' }, zoneRect: rect }),
    ).toBeNull()
  })

  it('places groups before or after the hovered group', () => {
    const group: DragSource = { kind: 'group', groupId: 'g1', categoryId: 'c' }
    const zone = { zone: 'group' as const, groupId: 'g3', categoryId: 'c', index: 2 }
    expect(
      resolveTarget({ ...base, pointer: { x: 250, y: 0 }, source: group, zone, zoneRect: rect }),
    ).toEqual({
      kind: 'groupInsert',
      categoryId: 'c',
      index: 3,
    })
  })
})

describe('indexAmongAll', () => {
  // a, b, c are shown; x and y are folded away (finished to-dos).
  const all = ['a', 'x', 'b', 'c', 'y']
  const shown = ['a', 'b', 'c']

  it('puts dropped items right before the shown item they land in front of', () => {
    expect(indexAmongAll(shown, all, 0)).toBe(0)
    expect(indexAmongAll(shown, all, 1)).toBe(2)
    expect(indexAmongAll(shown, all, 2)).toBe(3)
  })

  it('puts them right after the last shown item at the end, before what is folded', () => {
    expect(indexAmongAll(shown, all, 3)).toBe(4)
  })

  it('starts at the top when nothing is shown', () => {
    expect(indexAmongAll([], ['x', 'y'], 0)).toBe(0)
  })
})
