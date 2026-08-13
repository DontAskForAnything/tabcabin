import { Bell, Columns3, Rows3, Search } from 'lucide-react'
import { IconButton, Kbd, SegmentedControl, Tooltip, cn } from '@tabhangar/ui'
import { useT } from '@/i18n'
import { formatShortcut } from '@/lib/keys'
import { updateSettings, type ViewMode } from '@/settings/settings'
import { useUi } from '@/state/ui'
import type { ActiveContext } from '../useActive'
import { CategoryTabs } from './CategoryTabs'
import { MoreMenu } from './MoreMenu'
import { WorkspaceMenu } from './WorkspaceMenu'

export function TopBar({ active, compact }: { active: ActiveContext; compact: boolean }) {
  const t = useT()
  const openModal = useUi((s) => s.openModal)
  const { settings, category } = active
  const view: ViewMode = (category && settings?.viewModes[category.id]) || 'board'

  return (
    <header
      className={cn(
        'flex flex-wrap items-center gap-3 pt-[18px] pb-3.5',
        compact ? 'px-4' : 'px-7',
      )}
    >
      <WorkspaceMenu active={active} />
      <CategoryTabs active={active} />
      <div className="flex-1" />
      {!compact && category && settings && (
        <SegmentedControl<ViewMode>
          label={t('view.label')}
          value={view}
          onValueChange={(mode) =>
            void updateSettings({ viewModes: { ...settings.viewModes, [category.id]: mode } })
          }
          options={[
            { value: 'board', label: t('view.board'), icon: <Columns3 size={15} /> },
            { value: 'collections', label: t('view.collections'), icon: <Rows3 size={15} /> },
          ]}
        />
      )}
      <Tooltip
        label={t('search.button')}
        shortcut={formatShortcut(settings?.shortcuts.search ?? 'mod+k')}
      >
        <button
          type="button"
          onClick={() => openModal({ type: 'search' })}
          className="flex h-10 items-center gap-2 rounded-xl bg-card pr-2.5 pl-3 text-[13px] text-ink-3 shadow-tile transition-colors hover:text-ink"
        >
          <Search size={16} />
          {!compact && <span>{t('search.button')}</span>}
          {!compact && <Kbd>{formatShortcut(settings?.shortcuts.search ?? 'mod+k')}</Kbd>}
        </button>
      </Tooltip>
      <IconButton
        label={t('reminders.button')}
        icon={<Bell size={17} />}
        variant="tile"
        size="lg"
        onClick={() => openModal({ type: 'reminders' })}
      />
      <MoreMenu active={active} />
    </header>
  )
}
