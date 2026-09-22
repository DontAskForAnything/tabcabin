import {
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from '@tabhangar/ui'
import {
  AppWindow,
  ArrowDownAZ,
  ArrowUpDown,
  ClipboardCopy,
  CopyPlus,
  Ellipsis,
  FolderInput,
  Layers,
  ListTodo,
  Minimize2,
  Maximize2,
  StickyNote,
  Trash,
} from 'lucide-react'
import type { BoardGroup } from '@/db/hooks'
import { updateGroup } from '@/db/repo'
import { useT } from '@/i18n'
import type { ActiveContext } from '../../useActive'
import { GroupMoveToOtherWorkspaces } from '../MoveTargets'
import type { BoardActions } from '../actions'

export function GroupMenu({
  group,
  actions,
  active,
}: {
  group: BoardGroup
  actions: BoardActions
  active: ActiveContext
}) {
  const t = useT()
  const otherCategories = (active.categories ?? []).filter((cat) => cat.id !== group.categoryId)
  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton
          label={t('group.options')}
          icon={<Ellipsis size={17} />}
          size="sm"
          tooltip={false}
          className="text-ink-4"
        />
      </MenuTrigger>
      <MenuContent align="end" className="min-w-[240px]">
        <MenuItem icon={<Layers size={15} />} onSelect={() => void actions.openGroup(group)}>
          {t('group.openAll')}
        </MenuItem>
        <MenuItem
          icon={<AppWindow size={15} />}
          onSelect={() => void actions.openGroup(group, true)}
        >
          {t('group.openInWindow')}
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<StickyNote size={15} />} onSelect={() => void actions.addNote(group.id)}>
          {t('group.addNote')}
        </MenuItem>
        <MenuItem
          icon={<ListTodo size={15} />}
          onSelect={() => void actions.addNote(group.id, {}, true)}
        >
          {t('note.todo')}
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<CopyPlus size={15} />} onSelect={() => void actions.duplicateGroup(group)}>
          {t('group.duplicate')}
        </MenuItem>
        <MenuItem icon={<ClipboardCopy size={15} />} onSelect={() => void actions.copyGroup(group)}>
          {t('group.copyAsText')}
        </MenuItem>
        <MenuSub>
          <MenuSubTrigger icon={<FolderInput size={15} />}>{t('group.moveTo')}</MenuSubTrigger>
          <MenuSubContent className="min-w-[220px]">
            {otherCategories.map((cat) => (
              <MenuItem key={cat.id} onSelect={() => void actions.moveGroupTo(group, cat.id)}>
                {cat.name}
              </MenuItem>
            ))}
            {active.workspace && (
              <GroupMoveToOtherWorkspaces groupId={group.id} workspaceId={active.workspace.id} />
            )}
          </MenuSubContent>
        </MenuSub>
        <MenuSub>
          <MenuSubTrigger icon={<ArrowUpDown size={15} />}>{t('group.sortBy')}</MenuSubTrigger>
          <MenuSubContent>
            <MenuItem
              icon={<ArrowDownAZ size={15} />}
              onSelect={() => void actions.sortGroup(group, 'title')}
            >
              {t('group.sortTitle')}
            </MenuItem>
            <MenuItem onSelect={() => void actions.sortGroup(group, 'newest')}>
              {t('group.sortNewest')}
            </MenuItem>
            <MenuItem onSelect={() => void actions.sortGroup(group, 'oldest')}>
              {t('group.sortOldest')}
            </MenuItem>
          </MenuSubContent>
        </MenuSub>
        <MenuItem
          icon={group.collapsed ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
          onSelect={() => void updateGroup(group.id, { collapsed: !group.collapsed })}
        >
          {group.collapsed ? t('group.expand') : t('group.collapse')}
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          icon={<Trash size={15} />}
          danger
          onSelect={() => void actions.deleteGroup(group)}
        >
          {t('group.delete')}
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}
