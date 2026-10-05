import { Layers, MemoryStick, Pin, PinOff, Ungroup, X } from 'lucide-react'
import { ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from '@tabcabin/ui'
import { useT } from '@/i18n'
import { closeTabs } from '@/lib/tabs'
import type { OpenTab } from '../useOpenTabs'

/** Right-click menu of a tab; grouping and closing apply to the whole selection. */
export function TabContextMenu({ tab, tabIds }: { tab: OpenTab; tabIds: number[] }) {
  const t = useT()
  const ids = tabIds as [number, ...number[]]
  return (
    <ContextMenuContent>
      <ContextMenuItem
        icon={tab.pinned ? <PinOff size={14} /> : <Pin size={14} />}
        onSelect={() => void browser.tabs.update(tab.id, { pinned: !tab.pinned })}
      >
        {tab.pinned ? t('tab.unpin') : t('tab.pin')}
      </ContextMenuItem>
      <ContextMenuItem
        icon={<MemoryStick size={14} />}
        disabled={tab.active || tab.discarded}
        onSelect={() => void browser.tabs.discard(tab.id)}
      >
        {t('tab.discard')}
      </ContextMenuItem>
      {tab.groupId === -1 ? (
        <ContextMenuItem
          icon={<Layers size={14} />}
          onSelect={() => void browser.tabs.group({ tabIds: ids })}
        >
          {t('tab.group')}
        </ContextMenuItem>
      ) : (
        <ContextMenuItem
          icon={<Ungroup size={14} />}
          onSelect={() => void browser.tabs.ungroup(ids)}
        >
          {t('tab.ungroup')}
        </ContextMenuItem>
      )}
      <ContextMenuSeparator />
      <ContextMenuItem icon={<X size={14} />} danger onSelect={() => void closeTabs(tabIds)}>
        {t('tab.close')}
      </ContextMenuItem>
    </ContextMenuContent>
  )
}
