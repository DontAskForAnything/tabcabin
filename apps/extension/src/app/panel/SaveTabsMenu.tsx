import { Copy, Download, Plus, X } from 'lucide-react'
import {
  Button,
  Menu,
  MenuContent,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
  toast,
} from '@tabhangar/ui'
import { useLocale, useT } from '@/i18n'
import { closeTabs, duplicateTabIds } from '@/lib/tabs'
import type { ActiveContext } from '../useActive'
import { usePanel } from './panelStore'
import { saveTabs } from './saveTabs'
import { SaveToMenuItems } from './SaveToMenu'
import type { PanelData } from './usePanelData'
import { windowLabel } from './windowLabel'

/** Save the selected tabs (or all of them) somewhere, or tidy up the window. */
export function SaveTabsMenu({ data, active }: { data: PanelData; active: ActiveContext }) {
  const t = useT()
  const locale = useLocale()
  const selected = usePanel((s) => s.selected)
  const clearSelection = usePanel((s) => s.clear)
  const { inWindow, windowId } = data
  const selectionTabs = inWindow.filter((tab) => selected.includes(tab.id))
  const tabs = selectionTabs.length ? selectionTabs : inWindow
  const options = { t, settings: active.settings }
  const sessionTitle = t('panel.sessionTitle', {
    date: new Date().toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
  })

  return (
    <Menu>
      <MenuTrigger asChild>
        <Button
          variant="secondary"
          icon={<Download size={15} />}
          className="w-full"
          disabled={inWindow.length === 0}
        >
          {selected.length ? t('panel.saveAll').replace(/all /i, '') : t('panel.saveAll')}
        </Button>
      </MenuTrigger>
      <MenuContent side="top" className="min-w-[260px]">
        <MenuItem
          icon={<Plus size={14} />}
          onSelect={() => {
            if (!active.category) return
            void saveTabs(
              tabs,
              { newGroupIn: active.category.id, title: sessionTitle, emoji: '🗂️' },
              options,
            ).then(clearSelection)
          }}
        >
          {t('panel.saveAllNew')}
        </MenuItem>
        <MenuSub>
          <MenuSubTrigger icon={<Download size={14} />}>
            {t('panel.saveAllExisting')}
          </MenuSubTrigger>
          <MenuSubContent className="min-w-[230px]">
            <SaveToMenuItems
              active={active}
              onPick={(groupId) => void saveTabs(tabs, { groupId }, options).then(clearSelection)}
              onNewGroup={(categoryId) =>
                void saveTabs(tabs, { newGroupIn: categoryId }, options).then(clearSelection)
              }
            />
          </MenuSubContent>
        </MenuSub>
        <MenuSeparator />
        <MenuLabel>{windowId !== null ? windowLabel(windowId, data, t) : ''}</MenuLabel>
        <MenuItem
          icon={<Copy size={14} />}
          onSelect={async () => {
            const ids = duplicateTabIds(inWindow)
            if (!ids.length) return toast({ title: t('panel.noDuplicates'), tone: 'info' })
            await closeTabs(ids)
            toast({ title: t('panel.duplicatesRemoved', { count: ids.length }), tone: 'success' })
          }}
        >
          {t('panel.removeDuplicates')}
        </MenuItem>
        <MenuItem
          icon={<X size={14} />}
          danger
          onSelect={async () => {
            await closeTabs(inWindow.filter((tab) => !tab.pinned).map((tab) => tab.id))
            toast({ title: t('tab.closed', { count: inWindow.length }), tone: 'success' })
          }}
        >
          {t('panel.closeAll')}
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}
