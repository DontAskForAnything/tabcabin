import { useDraggable } from '@dnd-kit/core'
import { displayHost } from '@tabhangar/core'
import { cn, Favicon } from '@tabhangar/ui'
import { faviconUrl } from '@/lib/browser'
import { useDrag } from '../dnd/store'
import { type DragSource, dndId } from '../dnd/types'
import type { OpenTab } from './useOpenTabs'

export function DraggableTab({ tab, onActivate }: { tab: OpenTab; onActivate: () => void }) {
  const source: DragSource = {
    kind: 'tabs',
    tabIds: [tab.id],
    tabs: [{ id: tab.id, url: tab.url, title: tab.title, favIconUrl: tab.favIconUrl }],
  }
  const { setNodeRef, attributes, listeners } = useDraggable({
    id: dndId.tab(tab.id),
    data: {
      source,
      overlay: {
        kind: 'tab',
        title: tab.title,
        url: tab.url,
        favIconUrl: tab.favIconUrl,
        count: 1,
      },
    },
  })
  const dragging = useDrag((s) => s.source?.kind === 'tabs' && s.source.tabIds.includes(tab.id))
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...attributes}
      {...listeners}
      onClick={onActivate}
      className={cn(
        'flex items-center gap-[11px] rounded-[11px] px-2 py-1.5 text-left transition-[background,box-shadow,opacity] hover:bg-card hover:shadow-card',
        tab.active && 'bg-card shadow-tile',
        dragging && 'opacity-40',
      )}
    >
      <Favicon
        src={faviconUrl(tab.url) ?? tab.favIconUrl}
        seed={displayHost(tab.url) || tab.title}
        size="sm"
      />
      <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{tab.title}</span>
    </button>
  )
}
