import { type CollisionDetection, pointerWithin } from '@dnd-kit/core'
import { acceptsZone, type Point } from './logic'
import { useDrag } from './store'
import type { DragSource, DropZone } from './types'

/** When drop zones overlap, the more specific one wins (then the smaller one). */
const PRIORITY: Record<DropZone['zone'], number> = {
  item: 0,
  trash: 1,
  newGroup: 1,
  category: 1,
  list: 2,
  group: 3,
}

/**
 * Drop zones under the pointer that accept what is being dragged, best first. Reports the
 * pointer position to `onPointer` on every move.
 */
export function zoneCollision(onPointer: (point: Point) => void): CollisionDetection {
  return (args) => {
    if (args.pointerCoordinates) onPointer(args.pointerCoordinates)
    // Read from our store: the dragged node may unmount (e.g. after switching category mid-drag).
    const source =
      useDrag.getState().source ?? (args.active.data.current?.source as DragSource | undefined)
    const kinds = useDrag.getState().kinds
    // A zone that does not take what is dragged lets the one around it answer (the link a note
    // list belongs to, for a dragged link).
    const containers = args.droppableContainers.filter((container) => {
      const zone = container.data.current?.zone as DropZone | undefined
      return zone && source && acceptsZone(source, zone, kinds)
    })
    const hits = pointerWithin({ ...args, droppableContainers: containers })
    const area = (id: string | number) => {
      const rect = args.droppableRects.get(id)
      return rect ? rect.width * rect.height : Infinity
    }
    return hits.sort((a, b) => {
      const za = a.data?.droppableContainer.data.current?.zone as DropZone
      const zb = b.data?.droppableContainer.data.current?.zone as DropZone
      return PRIORITY[za.zone] - PRIORITY[zb.zone] || area(a.id) - area(b.id)
    })
  }
}
