import { Bell, ExternalLink, FolderInput, Pencil, Trash } from 'lucide-react'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@tabhangar/ui'
import type { ReactNode } from 'react'
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
  const targets = groups.filter((group) => group.id !== item.groupId)
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent>
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
                    const result = await moveItemsTo([item.id], { groupId: group.id, index: 9999 })
                    offerUndo(result, {
                      title: t('item.moved', { count: 1 }),
                      undoLabel: t('common.undo'),
                    })
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
          onSelect={() => void actions.deleteItems([item.id])}
        >
          {t('item.delete')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
