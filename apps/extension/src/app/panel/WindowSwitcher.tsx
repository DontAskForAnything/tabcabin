import { AppWindow, ChevronDown, Plus } from 'lucide-react'
import { IconButton, Menu, MenuContent, MenuItem, MenuSeparator, MenuTrigger } from '@tabcabin/ui'
import { useT } from '@/i18n'
import { usePanel } from './panelStore'
import type { PanelData } from './usePanelData'
import { windowLabel } from './windowLabel'

/** Which browser window the panel shows, and a button for a new window. */
export function WindowSwitcher({ data }: { data: PanelData }) {
  const t = useT()
  const setWindowId = usePanel((s) => s.setWindowId)
  const { tabs, loaded, windowId, currentWindowId, windowIds, inWindow } = data
  const newWindow = () => void browser.windows.create({ focused: true })
  return (
    <div className="flex gap-2">
      <Menu>
        <MenuTrigger asChild>
          <button
            type="button"
            className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[10px] bg-card px-2.5 text-[13px] font-medium shadow-tile"
          >
            <span className="size-2 shrink-0 rounded-full bg-success" />
            <span className="flex-1 truncate text-left">
              {windowId !== null ? windowLabel(windowId, data, t) : '…'}
              {loaded && ` · ${t('panel.windowTabs', { count: inWindow.length })}`}
            </span>
            <ChevronDown size={14} className="text-ink-3" />
          </button>
        </MenuTrigger>
        <MenuContent className="min-w-[240px]">
          {windowIds.map((id) => (
            <MenuItem
              key={id}
              icon={<AppWindow size={14} />}
              shortcut={id === windowId ? '✓' : undefined}
              onSelect={() => setWindowId(id === currentWindowId ? null : id)}
            >
              {windowLabel(id, data, t)} ·{' '}
              {t('panel.windowTabs', { count: tabs.filter((tab) => tab.windowId === id).length })}
            </MenuItem>
          ))}
          <MenuSeparator />
          <MenuItem icon={<Plus size={14} />} onSelect={newWindow}>
            {t('panel.newWindow')}
          </MenuItem>
        </MenuContent>
      </Menu>
      <IconButton
        label={t('panel.newWindow')}
        icon={<Plus size={16} />}
        variant="tile"
        size="md"
        onClick={newWindow}
      />
    </div>
  )
}
