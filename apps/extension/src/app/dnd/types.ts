interface DraggedTab {
  id: number
  url: string
  title: string
  favIconUrl: string | null
}

/** What is being dragged (stored in dnd-kit `data`). */
export type DragSource =
  | { kind: 'items'; ids: string[]; groupId: string; parentId: string | null }
  | { kind: 'group'; groupId: string; categoryId: string }
  | { kind: 'tabs'; tabIds: number[]; tabs: DraggedTab[] }

/** What a droppable represents. */
export type DropZone =
  | {
      zone: 'item'
      itemId: string
      groupId: string
      parentId: string | null
      itemKind: string
      index: number
      layout: 'list' | 'grid'
    }
  | { zone: 'list'; groupId: string; parentId: string | null; layout: 'list' | 'grid' }
  | { zone: 'group'; groupId: string; categoryId: string; index: number }
  | { zone: 'newGroup' }
  | { zone: 'trash' }
  | { zone: 'category'; categoryId: string }

/** Resolved result of hovering, rendered as indicators and applied on drop. */
export type DropTarget =
  | { kind: 'insert'; groupId: string; parentId: string | null; index: number }
  | { kind: 'combine'; itemId: string }
  | { kind: 'groupInsert'; categoryId: string; index: number }
  | { kind: 'newGroup' }
  | { kind: 'trash' }
  | { kind: 'category'; categoryId: string }
  | null

export const dndId = {
  item: (id: string) => `item:${id}`,
  list: (groupId: string, parentId: string | null) => `list:${groupId}:${parentId ?? ''}`,
  group: (id: string) => `group:${id}`,
  tab: (id: number) => `tab:${id}`,
  category: (id: string) => `category:${id}`,
  newGroup: 'new-group',
  trash: 'trash',
}
