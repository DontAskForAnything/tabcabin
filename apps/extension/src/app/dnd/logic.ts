import type { DragSource, DropTarget, DropZone } from './types'

export interface Rect {
  top: number
  left: number
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
}

/** Share of an item's height (top and bottom) that means "insert before/after" rather than "combine". */
const EDGE_RATIO = 0.3

export type ItemHover = { position: 'before' | 'after' } | { position: 'middle' }

/** Where the pointer is on an item: near the edges (insert) or in the middle (combine candidate). */
export function hoverOnItem(
  rect: Rect,
  pointer: Point,
  allowCombine: boolean,
  axis: 'x' | 'y' = 'y',
): ItemHover {
  const offset =
    axis === 'y'
      ? (pointer.y - rect.top) / Math.max(rect.height, 1)
      : (pointer.x - rect.left) / Math.max(rect.width, 1)
  if (!allowCombine) return { position: offset < 0.5 ? 'before' : 'after' }
  if (offset < EDGE_RATIO) return { position: 'before' }
  if (offset > 1 - EDGE_RATIO) return { position: 'after' }
  return { position: 'middle' }
}

/** Items can be combined onto links/stacks (when only links/stacks are dragged) or onto notes (only notes). */
export function canCombine(sourceKinds: readonly string[], targetKind: string): boolean {
  if (sourceKinds.length === 0) return false
  if (targetKind === 'note') return sourceKinds.every((kind) => kind === 'note')
  if (targetKind === 'link' || targetKind === 'stack')
    return sourceKinds.every((kind) => kind === 'link' || kind === 'stack' || kind === 'tab')
  return false
}

/** Insertion index inside a list from the pointer and the item rects (sorted top to bottom). */
export function indexFromPointer(itemRects: readonly Rect[], pointer: Point): number {
  let index = 0
  for (const rect of itemRects) {
    if (pointer.y > rect.top + rect.height / 2) index++
    else break
  }
  return index
}

/** Insertion index in a wrapping grid (reading order: rows, then left to right). */
export function gridIndexFromPointer(itemRects: readonly Rect[], pointer: Point): number {
  for (let i = 0; i < itemRects.length; i++) {
    const rect = itemRects[i]!
    if (pointer.y < rect.top) return i
    const sameRow = pointer.y <= rect.top + rect.height
    if (sameRow && pointer.x < rect.left + rect.width / 2) return i
  }
  return itemRects.length
}

/** Insertion index among groups laid out left to right (board) or top to bottom (collections). */
function groupIndexFromPointer(rect: Rect, pointer: Point, index: number, axis: 'x' | 'y'): number {
  const before =
    axis === 'x' ? pointer.x < rect.left + rect.width / 2 : pointer.y < rect.top + rect.height / 2
  return before ? index : index + 1
}

/**
 * Converts an index computed over the full list (including dragged items still in place)
 * into an index among the items that stay.
 */
export function indexAmongRemaining(
  order: readonly string[],
  moving: ReadonlySet<string>,
  index: number,
): number {
  let result = 0
  for (let i = 0; i < Math.min(index, order.length); i++) if (!moving.has(order[i]!)) result++
  return result
}

/**
 * Converts an index among the items a list shows into one among all of its items, for a list that
 * hides some (finished to-dos fold away below it): the new items go right before the shown item
 * they were dropped in front of, or right after the last shown one. Both lists leave out the items
 * being moved.
 */
export function indexAmongAll(
  shown: readonly string[],
  all: readonly string[],
  index: number,
): number {
  const next = shown[index]
  if (next !== undefined && all.includes(next)) return all.indexOf(next)
  const last = shown.findLast((id) => all.includes(id))
  return last === undefined ? 0 : all.indexOf(last) + 1
}

/** Which drop zones make sense for a source. */
export function acceptsZone(source: DragSource, zone: DropZone): boolean {
  switch (zone.zone) {
    case 'item':
    case 'list':
      return source.kind !== 'group'
    case 'group':
      return source.kind === 'group'
    case 'newGroup':
      return source.kind !== 'group'
    case 'trash':
      return source.kind !== 'tabs'
    case 'category':
      return true
  }
}

/** Resolves the zone under the pointer into a concrete target. */
export function resolveTarget(input: {
  source: DragSource
  zone: DropZone | null
  zoneRect: Rect | null
  pointer: Point
  sourceKinds: readonly string[]
  /** Rects of the items in the hovered list (for list zones). */
  listRects?: readonly Rect[]
  /** True once the pointer rested in the middle of `zone.itemId` long enough. */
  combineArmed: boolean
  groupAxis: 'x' | 'y'
}): DropTarget | { kind: 'combinePending'; itemId: string; fallback: DropTarget } {
  const { source, zone, zoneRect, pointer } = input
  if (!zone || !zoneRect || !acceptsZone(source, zone)) return null
  switch (zone.zone) {
    case 'item': {
      if (source.kind === 'items' && source.ids.includes(zone.itemId)) return null
      const allow = zone.parentId === null && canCombine(input.sourceKinds, zone.itemKind)
      const axis = zone.layout === 'grid' ? 'x' : 'y'
      const hover = hoverOnItem(zoneRect, pointer, allow, axis)
      if (hover.position === 'middle') {
        if (input.combineArmed) return { kind: 'combine', itemId: zone.itemId }
        const half =
          axis === 'y'
            ? pointer.y < zoneRect.top + zoneRect.height / 2
              ? 0
              : 1
            : pointer.x < zoneRect.left + zoneRect.width / 2
              ? 0
              : 1
        return {
          kind: 'combinePending',
          itemId: zone.itemId,
          fallback: {
            kind: 'insert',
            groupId: zone.groupId,
            parentId: zone.parentId,
            index: zone.index + half,
          },
        }
      }
      return {
        kind: 'insert',
        groupId: zone.groupId,
        parentId: zone.parentId,
        index: zone.index + (hover.position === 'after' ? 1 : 0),
      }
    }
    case 'list':
      return {
        kind: 'insert',
        groupId: zone.groupId,
        parentId: zone.parentId,
        index:
          zone.layout === 'grid'
            ? gridIndexFromPointer(input.listRects ?? [], pointer)
            : indexFromPointer(input.listRects ?? [], pointer),
      }
    case 'group':
      return {
        kind: 'groupInsert',
        categoryId: zone.categoryId,
        index: groupIndexFromPointer(zoneRect, pointer, zone.index, input.groupAxis),
      }
    case 'newGroup':
      return { kind: 'newGroup' }
    case 'trash':
      return { kind: 'trash' }
    case 'category':
      return { kind: 'category', categoryId: zone.categoryId }
  }
}
