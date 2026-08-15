import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { Item } from '@tabhangar/core'
import { useCallback } from 'react'
import { type OverlayInfo, useDrag } from './store'
import { type DragSource, dndId, type DropZone } from './types'

/**
 * Pointer listeners without dnd-kit's button role: our drag handles contain their own buttons,
 * and moving with the keyboard is done through menus.
 */
function dragHandleProps(drag: ReturnType<typeof useDraggable>) {
  return { ...drag.listeners, 'aria-roledescription': drag.attributes['aria-roledescription'] }
}

export function overlayForItem(item: Item & { children?: Item[] }): OverlayInfo {
  if (item.kind === 'note')
    return {
      kind: 'note',
      title: item.text.split('\n')[0]?.slice(0, 80) || '…',
      noteColor: item.color,
      count: 1,
    }
  if (item.kind === 'stack') {
    const first = item.children?.[0]
    return {
      kind: 'stack',
      title: item.title || `${item.children?.length ?? 0} ↗`,
      url: first?.url,
      count: 1,
    }
  }
  return {
    kind: item.kind === 'image' ? 'image' : 'link',
    title: item.title || item.url || item.imageUrl || '',
    url: item.url ?? item.imageUrl,
    favIconUrl: item.favIconUrl,
    count: 1,
  }
}

/** Makes an item both draggable and a drop target. */
export function useItemDnd(
  item: Item & { children?: Item[] },
  index: number,
  layout: 'list' | 'grid',
  disabled = false,
) {
  const source: DragSource = {
    kind: 'items',
    ids: [item.id],
    groupId: item.groupId,
    parentId: item.parentId,
  }
  const zone: DropZone = {
    zone: 'item',
    itemId: item.id,
    groupId: item.groupId,
    parentId: item.parentId,
    itemKind: item.kind,
    index,
    layout,
  }
  const drag = useDraggable({
    id: dndId.item(item.id),
    data: { source, overlay: overlayForItem(item) },
    disabled,
  })
  const drop = useDroppable({ id: dndId.item(item.id), data: { zone } })
  const setNodeRef = useCallback(
    (node: HTMLElement | null) => {
      drag.setNodeRef(node)
      drop.setNodeRef(node)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drag.setNodeRef, drop.setNodeRef],
  )
  const dragging = useDrag((s) => s.source?.kind === 'items' && s.source.ids.includes(item.id))
  const combineTarget = useDrag((s) => s.target?.kind === 'combine' && s.target.itemId === item.id)
  const pending = useDrag((s) => s.pendingCombine === item.id)
  return {
    setNodeRef,
    handleProps: dragHandleProps(drag),
    dragging,
    combineTarget,
    pending,
  }
}

/** Drop zone for the empty space of a list (end of a group / stack). */
export function useListDrop(groupId: string, parentId: string | null, layout: 'list' | 'grid') {
  const drop = useDroppable({
    id: dndId.list(groupId, parentId),
    data: { zone: { zone: 'list', groupId, parentId, layout } satisfies DropZone },
  })
  const insertAt = useDrag((s) =>
    s.target?.kind === 'insert' && s.target.groupId === groupId && s.target.parentId === parentId
      ? s.target.index
      : null,
  )
  return { setNodeRef: drop.setNodeRef, insertAt, listId: `${groupId}:${parentId ?? ''}` }
}

export function useGroupDnd(
  groupId: string,
  categoryId: string,
  index: number,
  overlay: OverlayInfo,
) {
  const drag = useDraggable({
    id: `${dndId.group(groupId)}:drag`,
    data: { source: { kind: 'group', groupId, categoryId } satisfies DragSource, overlay },
  })
  const drop = useDroppable({
    id: dndId.group(groupId),
    data: { zone: { zone: 'group', groupId, categoryId, index } satisfies DropZone },
  })
  const setNodeRef = useCallback(
    (node: HTMLElement | null) => {
      drag.setNodeRef(node)
      drop.setNodeRef(node)
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [drag.setNodeRef, drop.setNodeRef],
  )
  const dragging = useDrag((s) => s.source?.kind === 'group' && s.source.groupId === groupId)
  const receiving = useDrag(
    (s) =>
      s.source?.kind !== 'group' && s.target?.kind === 'insert' && s.target.groupId === groupId,
  )
  return { setNodeRef, handleProps: dragHandleProps(drag), dragging, receiving }
}

export function useGroupInsertIndex(categoryId: string) {
  return useDrag((s) =>
    s.target?.kind === 'groupInsert' && s.target.categoryId === categoryId ? s.target.index : null,
  )
}

export function useSimpleDrop(id: string, zone: DropZone, disabled = false) {
  const drop = useDroppable({ id, data: { zone }, disabled })
  const active = useDrag((s) => {
    const target = s.target
    if (!target) return false
    if (zone.zone === 'category')
      return target.kind === 'category' && target.categoryId === zone.categoryId
    return target.kind === zone.zone
  })
  const dragging = useDrag((s) => s.source !== null)
  const sourceKind = useDrag((s) => s.source?.kind ?? null)
  return { setNodeRef: drop.setNodeRef, active, dragging, sourceKind }
}
