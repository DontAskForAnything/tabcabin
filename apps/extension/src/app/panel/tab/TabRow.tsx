import { Check, Pin } from 'lucide-react'
import { cn, ContextMenu, ContextMenuTrigger } from '@tabhangar/ui'
import type { ActiveContext } from '../../useActive'
import type { OpenTab } from '../useOpenTabs'
import { TabContextMenu } from './TabContextMenu'
import { TabFavicon } from './TabFavicon'
import { TabHoverActions } from './TabHoverActions'
import { useOpenTab } from './useOpenTab'

/** An open tab in the panel: click to switch, Shift/Ctrl-click to select, drag to save. */
export function TabRow({
  tab,
  allTabs,
  active,
  nested = false,
}: {
  tab: OpenTab
  allTabs: OpenTab[]
  active: ActiveContext
  /** Inside a Chrome tab group (indented). */
  nested?: boolean
}) {
  const { selected, source, dragging, setNodeRef, listeners, activate } = useOpenTab(tab, allTabs)
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          ref={setNodeRef}
          {...listeners}
          role="button"
          tabIndex={0}
          aria-label={tab.title}
          aria-pressed={selected}
          onClick={activate}
          onKeyDown={(event) => {
            if (event.key === 'Enter') void browser.tabs.update(tab.id, { active: true })
          }}
          className={cn(
            'group/tab flex cursor-pointer items-center gap-[11px] rounded-[11px] py-1.5 pr-1.5 pl-2 transition-[background,box-shadow,opacity] duration-150 outline-none hover:bg-card hover:shadow-card focus-visible:shadow-[0_0_0_2px_var(--focus)]',
            nested && 'pl-5',
            tab.active && 'bg-card shadow-tile',
            selected && 'bg-accent-soft shadow-[0_0_0_1.5px_var(--accent)] hover:bg-accent-soft',
            dragging && 'opacity-40',
            tab.discarded && 'opacity-70',
          )}
        >
          <TabFavicon tab={tab} size="sm" />
          <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{tab.title}</span>
          {tab.pinned && <Pin size={12} className="shrink-0 text-ink-4" />}
          {selected && (
            <span className="flex size-[18px] shrink-0 items-center justify-center rounded-[6px] bg-accent text-on-accent">
              <Check size={12} strokeWidth={3} />
            </span>
          )}
          <TabHoverActions tab={tab} source={source} active={active} />
        </div>
      </ContextMenuTrigger>
      <TabContextMenu tab={tab} tabIds={source.tabIds} />
    </ContextMenu>
  )
}
