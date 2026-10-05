import { cn, Tooltip } from '@tabcabin/ui'
import type { OpenTab } from '../useOpenTabs'
import { TabFavicon } from './TabFavicon'
import { useOpenTab } from './useOpenTab'

/** An open tab in the icon rail: just its icon, with the title as a tooltip. */
export function TabTile({ tab, allTabs }: { tab: OpenTab; allTabs: OpenTab[] }) {
  const { selected, dragging, setNodeRef, listeners, activate } = useOpenTab(tab, allTabs)
  return (
    <Tooltip label={tab.title} side="right">
      <button
        ref={setNodeRef}
        type="button"
        {...listeners}
        aria-label={tab.title}
        onClick={activate}
        className={cn(
          'relative rounded-[11px] transition-opacity',
          dragging && 'opacity-40',
          selected && 'ring-2 ring-accent',
        )}
      >
        <TabFavicon tab={tab} size="lg" />
        {tab.active && (
          <span className="absolute -bottom-1 left-1/2 h-1 w-3 -translate-x-1/2 rounded-full bg-accent" />
        )}
      </button>
    </Tooltip>
  )
}
