import { ChevronDown, LayoutGrid, Plus } from 'lucide-react'
import { Menu, MenuContent, MenuItem, MenuLabel, MenuSeparator, MenuTrigger } from '@tabhangar/ui'
import { createWorkspace } from '@/db/repo'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'
import { setActiveCategory, setActiveWorkspace, type ActiveContext } from '../useActive'

export function WorkspaceMenu({ active }: { active: ActiveContext }) {
  const t = useT()
  const openModal = useUi((s) => s.openModal)
  const { workspace, workspaces, settings } = active

  const create = async () => {
    const result = await createWorkspace({
      name: t('workspace.defaultName', { n: (workspaces?.length ?? 0) + 1 }),
      categoryName: t('category.defaultName'),
    })
    if (settings) await setActiveCategory(settings, result.workspaceId, result.categoryId)
  }

  return (
    <Menu>
      <MenuTrigger asChild>
        <button
          type="button"
          aria-label={t('workspace.switch')}
          className="flex h-10 max-w-[240px] items-center gap-2 rounded-xl bg-card pr-3 pl-2 text-[14px] font-semibold shadow-tile transition-colors hover:bg-raised"
        >
          <span className="text-[20px] leading-none">{workspace?.emoji ?? '📦'}</span>
          <span className="truncate">{workspace?.name ?? '…'}</span>
          <ChevronDown size={14} className="shrink-0 text-ink-3" />
        </button>
      </MenuTrigger>
      <MenuContent className="min-w-[260px]">
        <MenuLabel>{t('workspace.switch')}</MenuLabel>
        {workspaces?.map((ws) => (
          <MenuItem
            key={ws.id}
            icon={<span className="text-[16px] leading-none">{ws.emoji}</span>}
            shortcut={ws.id === workspace?.id ? '✓' : undefined}
            onSelect={() => void setActiveWorkspace(ws.id)}
          >
            {ws.name}
          </MenuItem>
        ))}
        <MenuSeparator />
        <MenuItem icon={<Plus size={15} />} onSelect={() => void create()}>
          {t('workspace.new')}
        </MenuItem>
        <MenuItem
          icon={<LayoutGrid size={15} />}
          onSelect={() => openModal({ type: 'workspaces' })}
        >
          {t('workspace.manage')}
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}
