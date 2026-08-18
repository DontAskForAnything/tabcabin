import { FolderInput } from 'lucide-react'
import {
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
} from '@tabhangar/ui'
import { useOverview } from '@/db/overview'
import { moveCategory, moveGroup } from '@/db/repo'
import { useT } from '@/i18n'
import { offerUndo } from '@/state/undo'

/** "Other workspaces ▸ categories" entries for a group's Move to menu (mounted only while open). */
export function GroupMoveToOtherWorkspaces({
  groupId,
  workspaceId,
}: {
  groupId: string
  workspaceId: string
}) {
  const t = useT()
  const others = (useOverview() ?? []).filter(
    (ws) => ws.id !== workspaceId && ws.categories.length > 0,
  )
  if (others.length === 0) return null
  return (
    <>
      <MenuSeparator />
      <MenuLabel>{t('group.otherWorkspaces')}</MenuLabel>
      {others.map((ws) => (
        <MenuSub key={ws.id}>
          <MenuSubTrigger icon={<span className="text-[14px] leading-none">{ws.emoji}</span>}>
            {ws.name}
          </MenuSubTrigger>
          <MenuSubContent>
            {ws.categories.map((cat) => (
              <MenuItem
                key={cat.id}
                onSelect={async () =>
                  offerUndo(await moveGroup(groupId, { categoryId: cat.id, index: 9999 }), {
                    title: t('group.moved'),
                    undoLabel: t('common.undo'),
                  })
                }
              >
                {cat.name}
              </MenuItem>
            ))}
          </MenuSubContent>
        </MenuSub>
      ))}
    </>
  )
}

/** Context-menu entry moving a category to another workspace. */
export function CategoryMoveToWorkspace({
  categoryId,
  workspaceId,
}: {
  categoryId: string
  workspaceId: string
}) {
  const t = useT()
  const others = (useOverview() ?? []).filter((ws) => ws.id !== workspaceId)
  if (others.length === 0) return null
  return (
    <ContextMenuSub>
      <ContextMenuSubTrigger icon={<FolderInput size={14} />}>
        {t('category.moveToWorkspace')}
      </ContextMenuSubTrigger>
      <ContextMenuSubContent>
        {others.map((ws) => (
          <ContextMenuItem
            key={ws.id}
            icon={<span className="text-[14px] leading-none">{ws.emoji}</span>}
            onSelect={async () =>
              offerUndo(await moveCategory(categoryId, { workspaceId: ws.id }), {
                title: t('category.moved'),
                undoLabel: t('common.undo'),
              })
            }
          >
            {ws.name}
          </ContextMenuItem>
        ))}
      </ContextMenuSubContent>
    </ContextMenuSub>
  )
}
