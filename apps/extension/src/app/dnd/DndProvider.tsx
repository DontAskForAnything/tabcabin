import {
  type Announcements,
  type CollisionDetection,
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  MeasuringStrategy,
  PointerSensor,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { type ReactNode, useMemo, useRef } from 'react'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'
import { useBoardActions } from '../board/actions'
import { setActiveCategory, type ActiveContext } from '../useActive'
import { applyDrop, listOrder, listRects } from './apply'
import { acceptsZone, type Point, resolveTarget } from './logic'
import { DragPreview } from './DragPreview'
import { type OverlayInfo, useDrag } from './store'
import type { DragSource, DropZone } from './types'

const COMBINE_DELAY = 450
const CATEGORY_DELAY = 550

const PRIORITY: Record<DropZone['zone'], number> = {
  item: 0,
  trash: 1,
  newGroup: 1,
  category: 1,
  list: 2,
  group: 3,
}

interface MoveSnapshot {
  zone: DropZone | null
  rect: { top: number; left: number; width: number; height: number } | null
}

export function DndProvider({ active, children }: { active: ActiveContext; children: ReactNode }) {
  const t = useT()
  const actions = useBoardActions(active)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const pointer = useRef<Point>({ x: 0, y: 0 })
  const last = useRef<MoveSnapshot>({ zone: null, rect: null })
  const combine = useRef<{
    itemId: string | null
    armed: boolean
    timer: ReturnType<typeof setTimeout> | null
  }>({
    itemId: null,
    armed: false,
    timer: null,
  })
  const category = useRef<{ id: string | null; timer: ReturnType<typeof setTimeout> | null }>({
    id: null,
    timer: null,
  })
  const activeRef = useRef(active)
  activeRef.current = active

  const collision: CollisionDetection = (args) => {
    if (args.pointerCoordinates) pointer.current = args.pointerCoordinates
    // Read from our store: the dragged node may unmount (e.g. after switching category mid-drag).
    const source =
      useDrag.getState().source ?? (args.active.data.current?.source as DragSource | undefined)
    const containers = args.droppableContainers.filter((container) => {
      const zone = container.data.current?.zone as DropZone | undefined
      return zone && source && acceptsZone(source, zone)
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

  const clearTimers = () => {
    if (combine.current.timer) clearTimeout(combine.current.timer)
    if (category.current.timer) clearTimeout(category.current.timer)
    combine.current = { itemId: null, armed: false, timer: null }
    category.current = { id: null, timer: null }
  }

  const sourceKinds = (source: DragSource): string[] => {
    if (source.kind === 'tabs') return source.tabs.map(() => 'tab')
    if (source.kind === 'group') return ['group']
    const kinds = useDrag.getState().overlay?.kind
    return source.ids.map(() => kinds ?? 'link')
  }

  const update = () => {
    const state = useDrag.getState()
    const source = state.source
    if (!source) return
    const { zone, rect } = last.current
    const result = resolveTarget({
      source,
      zone,
      zoneRect: rect,
      pointer: pointer.current,
      sourceKinds: sourceKinds(source),
      listRects: zone?.zone === 'list' ? listRects(zone.groupId, zone.parentId) : undefined,
      combineArmed:
        zone?.zone === 'item' && combine.current.armed && combine.current.itemId === zone.itemId,
      groupAxis: activeViewAxis(activeRef.current),
    })

    if (result && result.kind === 'combinePending') {
      if (combine.current.itemId !== result.itemId) {
        if (combine.current.timer) clearTimeout(combine.current.timer)
        combine.current = {
          itemId: result.itemId,
          armed: false,
          timer: setTimeout(() => {
            combine.current.armed = true
            update()
          }, COMBINE_DELAY),
        }
      }
      state.set({ target: result.fallback, pendingCombine: result.itemId })
      return
    }
    if (!result || result.kind !== 'combine') {
      if (combine.current.timer) clearTimeout(combine.current.timer)
      combine.current = { itemId: null, armed: false, timer: null }
    }

    if (result?.kind === 'category') {
      const ctx = activeRef.current
      if (category.current.id !== result.categoryId && result.categoryId !== ctx.category?.id) {
        if (category.current.timer) clearTimeout(category.current.timer)
        category.current = {
          id: result.categoryId,
          timer: setTimeout(() => {
            const now = activeRef.current
            if (now.settings && now.workspace)
              void setActiveCategory(now.settings, now.workspace.id, result.categoryId)
          }, CATEGORY_DELAY),
        }
      }
    } else if (category.current.timer) {
      clearTimeout(category.current.timer)
      category.current = { id: null, timer: null }
    }

    state.set({ target: result, pendingCombine: null })
  }

  const onDragStart = (event: DragStartEvent) => {
    let source = event.active.data.current?.source as DragSource
    const overlay = event.active.data.current?.overlay as OverlayInfo
    if (source.kind === 'items') {
      const ui = useUi.getState()
      const [first] = source.ids
      if (first && ui.selection.includes(first) && ui.selectionGroupId === source.groupId) {
        const order = listOrder(source.groupId, source.parentId)
        const ids = order.filter((id) => ui.selection.includes(id))
        source = { ...source, ids: ids.length ? ids : source.ids }
      }
    }
    useUi.getState().setEditingNote(null)
    useDrag.getState().set({
      source,
      overlay: { ...overlay, count: source.kind === 'items' ? source.ids.length : overlay.count },
      target: null,
      pendingCombine: null,
    })
  }

  const onDragMove = (event: DragMoveEvent | DragOverEvent) => {
    const over = event.over
    last.current = {
      zone: (over?.data.current?.zone as DropZone | undefined) ?? null,
      rect: over?.rect ?? null,
    }
    update()
  }

  const finish = (event?: DragEndEvent) => {
    const { source, target } = useDrag.getState()
    clearTimers()
    useDrag.getState().reset()
    if (event && source && target && event.over !== null) {
      const ctx = activeRef.current
      void applyDrop(source, target, {
        t,
        actions,
        settings: ctx.settings,
        categoryId: ctx.category?.id,
      }).then(() => useUi.getState().clearSelection())
    }
  }

  const announcements = useMemo<Announcements>(
    () => ({
      onDragStart: () => t('dnd.pickedUp'),
      onDragOver: () => undefined,
      onDragEnd: ({ over }) => (over ? t('dnd.dropped') : t('dnd.cancelled')),
      onDragCancel: () => t('dnd.cancelled'),
    }),
    [t],
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collision}
      measuring={{ droppable: { strategy: MeasuringStrategy.Always } }}
      onDragStart={onDragStart}
      onDragMove={onDragMove}
      onDragOver={onDragMove}
      onDragEnd={finish}
      onDragCancel={() => finish()}
      accessibility={{
        announcements,
        screenReaderInstructions: { draggable: t('dnd.instructions') },
      }}
      autoScroll={{ threshold: { x: 0.12, y: 0.12 }, acceleration: 14 }}
    >
      {children}
      <DragOverlay dropAnimation={null} zIndex={200}>
        <DragPreview />
      </DragOverlay>
    </DndContext>
  )
}

function activeViewAxis(active: ActiveContext): 'x' | 'y' {
  const view = active.category ? active.settings?.viewModes[active.category.id] : undefined
  return view === 'collections' ? 'y' : 'x'
}
