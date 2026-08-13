import type { BoardGroup, BoardItem } from '@/db/hooks'
import type { ActiveContext } from '../useActive'
import type { BoardActions } from './actions'
import { ImageItem } from './items/ImageItem'
import { LinkRow } from './items/LinkRow'
import { NoteItem } from './items/NoteItem'
import { StackItem } from './items/StackItem'

export interface ItemViewProps {
  item: BoardItem
  group: BoardGroup
  actions: BoardActions
  active: ActiveContext
}

export function ItemView(props: ItemViewProps) {
  switch (props.item.kind) {
    case 'link':
      return <LinkRow {...props} />
    case 'note':
      return <NoteItem {...props} />
    case 'stack':
      return <StackItem {...props} />
    case 'image':
      return <ImageItem {...props} />
  }
}
