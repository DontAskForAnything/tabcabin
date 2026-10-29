import {
  type Announcements,
  DndContext,
  type DragEndEvent,
  type DragMoveEvent,
  type DragOverEvent,
  DragOverlay,
  type DragStartEvent,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { type ReactNode, useMemo, useRef } from 'react'
import * as repo from '@/db/repo'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'
import { useBoardActions } from '../board/actions'
import { setActiveCategory, type ActiveContext } from '../useActive'
import { applyDrop, listOrder, listRects } from './apply'
import { zoneCollision } from './collision'
import { type Point, resolveTarget } from './logic'
import { DragPreview } from './DragPreview'
import { rememberTakeoff } from './glide'
import { type OverlayInfo, useDrag } from './store'
import type { DragSource, DropZone } from './types'

const COMBINE_DELAY = 450
const CATEGORY_DELAY = 550

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
  // A link's own note being turned into a pinned note for the drag (see onDragStart).
  const detached = useRef<Promise<DragSource | null> | null>(null)

  const collision = useMemo(() => zoneCollision((point) => (pointer.current = point)), [])

  const clearTimers = () => {
    if (combine.current.timer) clearTimeout(combine.current.timer)
    if (category.current.timer) clearTimeout(category.current.timer)
    combine.current = { itemId: null, armed: false, timer: null }
    category.current = { id: null, timer: null }
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
      sourceKinds: state.kinds,
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
    detached.current = null
    if (source.kind === 'linkText') {
      // The link's own note becomes a pinned note (it looks the same), and the drag carries it.
      const { linkId, groupId } = source
      const started = source
      detached.current = repo.detachLinkText(linkId).then((id) => {
        const items: DragSource | null = id
          ? { kind: 'items', ids: [id], groupId, parentId: linkId }
          : null
        if (items && useDrag.getState().source === started)
          useDrag.getState().set({ source: items })
        return items
      })
    }
    useUi.getState().setEditingNote(null)
    useDrag.getState().set({
      source,
      kinds: kindsOf(source, overlay),
      overlay: { ...overlay, count: source.kind === 'items' ? source.ids.length : overlay.count },
      target: null,
      pendingCombine: null,
    })
  }

  const onDragMove = (event: DragMoveEvent | DragOverEvent) => {
    const over = event.over
    const zone = (over?.data.current?.zone as DropZone | undefined) ?? null
    last.current = {
      zone,
      // A link with notes under it: only the link itself counts for before / onto / after.
      rect: (zone?.zone === 'item' && headRect(zone.itemId)) || (over?.rect ?? null),
    }
    update()
  }

  const finish = (event?: DragEndEvent) => {
    const { source, target } = useDrag.getState()
    const preview = document.querySelector('[data-drag-preview]')?.getBoundingClientRect()
    const detaching = detached.current
    clearTimers()
    useDrag.getState().reset()
    if (!event || !source || !target || event.over === null) return
    const ctx = activeRef.current
    void (async () => {
      const dropped = source.kind === 'linkText' ? await detaching : source
      if (!dropped) return
      if (dropped.kind === 'items') {
        useDrag.getState().set({ settling: dropped.ids })
        if (preview) rememberTakeoff(dropped.ids, preview, true)
      }
      try {
        await applyDrop(dropped, target, {
          t,
          actions,
          settings: ctx.settings,
          categoryId: ctx.category?.id,
        })
      } finally {
        // The board shows the saved change a moment later.
        setTimeout(() => useDrag.getState().set({ settling: [] }), 150)
      }
      useUi.getState().clearSelection()
    })()
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

function headRect(itemId: string): DOMRect | null {
  return (
    document.querySelector(`[data-dnd-head="${CSS.escape(itemId)}"]`)?.getBoundingClientRect() ??
    null
  )
}

/** Kinds of what is dragged; a selection is read from the board, where each item marks its kind. */
function kindsOf(source: DragSource, overlay: OverlayInfo): string[] {
  if (source.kind === 'tabs') return source.tabs.map(() => 'tab')
  if (source.kind === 'group') return ['group']
  if (source.kind === 'linkText') return ['note']
  return source.ids.map(
    (id) =>
      document.querySelector<HTMLElement>(`[data-dnd-item="${CSS.escape(id)}"]`)?.dataset.dndKind ??
      overlay.kind,
  )
}

function activeViewAxis(active: ActiveContext): 'x' | 'y' {
  const view = active.category ? active.settings?.viewModes[active.category.id] : undefined
  return view === 'collections' ? 'y' : 'x'
}
