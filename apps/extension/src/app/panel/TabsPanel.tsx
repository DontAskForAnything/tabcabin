import { Search } from 'lucide-react'
import { isSavableUrl } from '@tabhangar/core'
import { Input } from '@tabhangar/ui'
import { useMemo, useState } from 'react'
import { useT } from '@/i18n'
import { HangarMark } from '../HangarMark'
import type { ActiveContext } from '../useActive'
import { DraggableTab } from './DraggableTab'
import { useCurrentWindowId, useOpenTabs } from './useOpenTabs'

export function TabsPanel({ active }: { active: ActiveContext }) {
  const t = useT()
  const tabs = useOpenTabs()
  const windowId = useCurrentWindowId()
  const [filter, setFilter] = useState('')
  const width = active.settings?.sidebarWidth ?? 292

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return tabs
      .filter((tab) => tab.windowId === windowId && isSavableUrl(tab.url))
      .filter(
        (tab) => !q || tab.title.toLowerCase().includes(q) || tab.url.toLowerCase().includes(q),
      )
      .sort((a, b) => a.index - b.index)
  }, [tabs, windowId, filter])

  return (
    <nav
      aria-label={t('panel.openTabs')}
      style={{ width }}
      className="sticky top-0 flex h-screen shrink-0 flex-col gap-3.5 border-r border-line bg-panel px-3.5 pt-[18px] pb-4"
    >
      <div className="flex items-center gap-2.5 px-1">
        <span className="flex size-[34px] items-center justify-center rounded-[10px] bg-accent text-white shadow-glow">
          <HangarMark size={19} />
        </span>
        <span className="flex-1 text-[16px] font-semibold tracking-[-0.02em]">TabHangar</span>
      </div>
      <Input
        leading={<Search size={15} />}
        placeholder={t('panel.filter')}
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        className="h-9"
      />
      <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1">
        {visible.map((tab) => (
          <DraggableTab
            key={tab.id}
            tab={tab}
            onActivate={() => void browser.tabs.update(tab.id, { active: true })}
          />
        ))}
      </div>
    </nav>
  )
}
