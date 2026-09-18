import { Bell, Columns3, Rows3, Search } from 'lucide-react'
import { IconButton, Kbd, SegmentedControl, Tooltip, cn } from '@tabhangar/ui'
import { useT } from '@/i18n'
import { formatShortcut } from '@/lib/keys'
import { updateSettings, type ViewMode } from '@/settings/settings'
import { useUi } from '@/state/ui'
import { useDueCount } from '../reminders/useDue'
import type { ActiveContext } from '../useActive'
import { CategoryTabs } from './CategoryTabs'
import { MoreMenu } from './MoreMenu'
import { SyncButton } from './SyncButton'
import { WorkspaceMenu } from './WorkspaceMenu'

/** Text labels give way to icons on narrower screens so the bar stays on one line. */
const NARROW_HIDDEN = 'max-[1440px]:sr-only'

export function TopBar({ active, compact }: { active: ActiveContext; compact: boolean }) {
  const t = useT()
  const openModal = useUi((s) => s.openModal)
  const dueCount = useDueCount()
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
            {
              value: 'board',
              label: <span className={NARROW_HIDDEN}>{t('view.board')}</span>,
              icon: <Columns3 size={15} />,
            },
            {
              value: 'collections',
              label: <span className={NARROW_HIDDEN}>{t('view.collections')}</span>,
              icon: <Rows3 size={15} />,
            },
          ]}
        />
      )}
      <Tooltip
        label={t('search.button')}
        shortcut={formatShortcut(settings?.shortcuts.search ?? 'mod+k')}
      >
        <button
          type="button"
          aria-label={t('search.button')}
          onClick={() => openModal({ type: 'search' })}
          className="flex h-10 items-center gap-2 rounded-xl bg-card pr-2.5 pl-3 text-[13px] text-ink-3 shadow-tile transition-colors hover:text-ink"
        >
          <Search size={16} />
          {!compact && <span className="max-[1440px]:hidden">{t('search.button')}</span>}
          {!compact && (
            <Kbd className="max-[1440px]:hidden">
              {formatShortcut(settings?.shortcuts.search ?? 'mod+k')}
            </Kbd>
          )}
        </button>
      </Tooltip>
      <SyncButton compact={compact} hideLabel={NARROW_HIDDEN} />
      <IconButton
        label={t('reminders.button')}
        icon={<Bell size={17} />}
        variant="tile"
        size="lg"
        badge={dueCount > 0 ? dueCount : undefined}
        onClick={() => openModal({ type: 'reminders' })}
      />
      <MoreMenu active={active} />
    </header>
  )
}
