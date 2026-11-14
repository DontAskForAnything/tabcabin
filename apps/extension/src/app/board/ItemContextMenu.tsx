import {
  Bell,
  CopyPlus,
  ExternalLink,
  FolderInput,
  Pencil,
  PinOff,
  StickyNote,
  Trash,
} from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@tabcabin/ui'
import type { Item } from '@tabcabin/core'
import type { ReactNode } from 'react'
import { db } from '@/db/db'
import type { BoardItem } from '@/db/hooks'
import { moveItemsTo } from '@/db/repo'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'
import { offerUndo } from '@/state/undo'
import type { BoardActions } from './actions'

export interface GroupOption {
  id: string
  title: string
  emoji: string
}

/** Right-click menu for an item; also the keyboard way to move items between groups. */
export function ItemContextMenu({
  item,
  groups,
  actions,
  children,
}: {
  item: BoardItem
  groups: GroupOption[]
  actions: BoardActions
  children: ReactNode
}) {
  const t = useT()
  const openModal = useUi((s) => s.openModal)
  const editReminder = useUi((s) => s.editReminder)
  const setRenameStack = useUi((s) => s.setRenameStack)
  const targets = groups.filter((group) => group.id !== item.groupId)
  /** Duplicate, move and delete work on every selected item when this is one of them. */
  const chosenIds = () => {
    const { selection } = useUi.getState()
    return selection.includes(item.id) ? selection : [item.id]
  }
  const chosenItems = async (): Promise<Item[]> => {
    const ids = chosenIds()
    if (ids.length === 1) return [item]
    return (await db.items.bulkGet(ids)).filter((row): row is Item => !!row && !row.deletedAt)
  }
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent
        // Renaming a stack takes the focus to its name.
        onCloseAutoFocus={(event) => {
          if (useUi.getState().renameStackId === item.id) event.preventDefault()
        }}
      >
        {item.kind === 'stack' && (
          <ContextMenuItem icon={<Pencil size={14} />} onSelect={() => setRenameStack(item.id)}>
            {t('stack.rename')}
          </ContextMenuItem>
        )}
        {(item.url || item.imageUrl) && (
          <ContextMenuItem
            icon={<ExternalLink size={14} />}
            onSelect={() => actions.openItem(item)}
          >
            {t('item.open')}
          </ContextMenuItem>
        )}
        {item.kind === 'link' && (
          <ContextMenuItem
            icon={<Pencil size={14} />}
            onSelect={() => openModal({ type: 'linkEditor', itemId: item.id })}
          >
            {t('item.edit')}
          </ContextMenuItem>
        )}
        <ContextMenuItem
          icon={<CopyPlus size={14} />}
          onSelect={async () => void actions.duplicateItems(await chosenItems())}
        >
          {t('item.duplicate')}
        </ContextMenuItem>
        {item.kind === 'link' && (
          <ContextMenuItem
            icon={<StickyNote size={14} />}
            onSelect={() => void actions.addPinnedNote(item.id)}
          >
            {t('link.addNote')}
          </ContextMenuItem>
        )}
        {item.kind === 'note' && item.parentId && (
          <ContextMenuItem
            icon={<PinOff size={14} />}
            onSelect={() => void actions.unpinNotes([item.id])}
          >
            {t('link.unpin')}
          </ContextMenuItem>
        )}
        {item.kind !== 'stack' && (
          <ContextMenuItem icon={<Bell size={14} />} onSelect={() => editReminder(item.id)}>
            {t('item.reminder')}
          </ContextMenuItem>
        )}
        {targets.length > 0 && (
          <ContextMenuSub>
            <ContextMenuSubTrigger icon={<FolderInput size={14} />}>
              {t('item.moveTo')}
            </ContextMenuSubTrigger>
            <ContextMenuSubContent>
              {targets.map((group) => (
                <ContextMenuItem
                  key={group.id}
                  icon={<span className="text-[14px] leading-none">{group.emoji}</span>}
                  onSelect={async () => {
                    const ids = chosenIds()
                    const result = await moveItemsTo(ids, { groupId: group.id, index: 9999 })
                    offerUndo(result, {
                      title: t('item.moved', { count: ids.length }),
                      undoLabel: t('common.undo'),
                    })
                    useUi.getState().clearSelection()
                  }}
                >
                  {group.title || t('group.untitled')}
                </ContextMenuItem>
              ))}
            </ContextMenuSubContent>
          </ContextMenuSub>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          icon={<Trash size={14} />}
          danger
          onSelect={() => void actions.deleteItems(chosenIds())}
        >
          {t('item.delete')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
