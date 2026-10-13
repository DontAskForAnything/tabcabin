import { X } from 'lucide-react'
import { IconButton } from '@tabcabin/ui'
import { useMemo, useState } from 'react'
import { useT } from '@/i18n'
import type { ActiveContext } from '../useActive'
import { PanelHeader } from './PanelHeader'
import { usePanel } from './panelStore'
import { SaveTabsMenu } from './SaveTabsMenu'
import { filterTabs, tabBlocks } from './tabBlocks'
import { TabFilter } from './TabFilter'
import { TabList } from './TabList'
import { usePanelData } from './usePanelData'
import { WindowSwitcher } from './WindowSwitcher'
import { WeekLine } from '../stats/WeekLine'

/** The open tabs panel: windows, a filter, the tabs and what to do with them. */
export function PanelBody({
  active,
  onPinChange,
}: {
  active: ActiveContext
  onPinChange?: () => void
}) {
  const t = useT()
  const data = usePanelData()
  const selected = usePanel((s) => s.selected)
  const clearSelection = usePanel((s) => s.clear)
  const [filter, setFilter] = useState('')
  const blocks = useMemo(
    () => tabBlocks(filterTabs(data.inWindow, filter), data.groups),
    [data.inWindow, data.groups, filter],
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-3.5 px-3.5 pt-[18px] pb-4">
      <PanelHeader pinned={active.settings?.sidebarMode !== 'rail'} onPinChange={onPinChange} />
      <WindowSwitcher data={data} />
      <TabFilter value={filter} onChange={setFilter} />
      <TabList blocks={blocks} allTabs={data.inWindow} loaded={data.loaded} active={active} />

      {selected.length > 0 && (
        <div className="flex items-center justify-between rounded-[11px] bg-accent-soft px-3 py-2 text-[12.5px] font-semibold text-accent-ink">
          {t('panel.selected', { count: selected.length })}
          <IconButton
            label={t('selection.clear')}
            icon={<X size={13} />}
            size="xs"
            tooltip={false}
            onClick={clearSelection}
          />
        </div>
      )}

      {active.settings?.showWeek !== false && <WeekLine />}
      <SaveTabsMenu data={data} active={active} />
    </div>
  )
}
