import { useDraggable } from '@dnd-kit/core'
import { Check, ChevronDown, Layers, MemoryStick, Pin, PinOff, Ungroup, X } from 'lucide-react'
import { displayHost } from '@tabhangar/core'
import {
  cn,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  Favicon,
  IconButton,
  Menu,
  MenuContent,
  MenuTrigger,
  Tooltip,
} from '@tabhangar/ui'
import type { MouseEvent } from 'react'
import { useT } from '@/i18n'
import { faviconUrl } from '@/lib/browser'
import { closeTabs } from '@/lib/tabs'
import { useDrag } from '../dnd/store'
import { type DragSource, dndId } from '../dnd/types'
import type { ActiveContext } from '../useActive'
import { usePanel } from './panelStore'
import { saveTabs } from './saveTabs'
import { SaveToMenuItems } from './SaveToMenu'
import type { OpenTab } from './useOpenTabs'

/** Tabs dragged together: the selection when this tab is part of it, else just this tab. */
function dragSourceFor(
  tab: OpenTab,
  selected: number[],
  all: OpenTab[],
): Extract<DragSource, { kind: 'tabs' }> {
  const tabs = selected.includes(tab.id) ? all.filter((t) => selected.includes(t.id)) : [tab]
  return {
    kind: 'tabs',
    tabIds: tabs.map((t) => t.id),
    tabs: tabs.map((t) => ({ id: t.id, url: t.url, title: t.title, favIconUrl: t.favIconUrl })),
  }
}

export function TabRow({
  tab,
  allTabs,
  active,
  variant = 'row',
  nested = false,
}: {
  tab: OpenTab
  allTabs: OpenTab[]
  active: ActiveContext
  variant?: 'row' | 'tile'
  nested?: boolean
}) {
  const t = useT()
  const selectedIds = usePanel((s) => s.selected)
  const toggle = usePanel((s) => s.toggle)
  const selected = selectedIds.includes(tab.id)
  const source = dragSourceFor(tab, selectedIds, allTabs)
  const { setNodeRef, listeners } = useDraggable({
    id: dndId.tab(tab.id),
    data: {
      source,
      overlay: {
        kind: 'tab',
        title: tab.title,
        url: tab.url,
        favIconUrl: tab.favIconUrl,
        count: source.tabIds.length,
      },
    },
  })
  const dragging = useDrag((s) => s.source?.kind === 'tabs' && s.source.tabIds.includes(tab.id))
  const favicon = (
    <Favicon
      src={[faviconUrl(tab.url), tab.favIconUrl]}
      seed={displayHost(tab.url) || tab.title}
      size={variant === 'tile' ? 'lg' : 'sm'}
    />
  )

  const activate = (event: MouseEvent) => {
    if (event.shiftKey || event.metaKey || event.ctrlKey) {
      toggle(tab.id)
      return
    }
    void browser.tabs.update(tab.id, { active: true })
    void browser.windows.update(tab.windowId, { focused: true })
  }

  if (variant === 'tile')
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
          {favicon}
          {tab.active && (
            <span className="absolute -bottom-1 left-1/2 h-1 w-3 -translate-x-1/2 rounded-full bg-accent" />
          )}
        </button>
      </Tooltip>
    )

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
            'group/tab flex cursor-default items-center gap-[11px] rounded-[11px] py-1.5 pr-1.5 pl-2 transition-[background,box-shadow,opacity] duration-150 outline-none hover:bg-card hover:shadow-card focus-visible:shadow-[0_0_0_2px_var(--focus)]',
            nested && 'pl-5',
            tab.active && 'bg-card shadow-tile',
            selected && 'bg-accent-soft shadow-[0_0_0_1.5px_var(--accent)] hover:bg-accent-soft',
            dragging && 'opacity-40',
            tab.discarded && 'opacity-70',
          )}
        >
          {favicon}
          <span className="min-w-0 flex-1 truncate text-[13.5px] font-medium">{tab.title}</span>
          {tab.pinned && <Pin size={12} className="shrink-0 text-ink-4" />}
          {selected && (
            <span className="flex size-[18px] shrink-0 items-center justify-center rounded-[6px] bg-accent text-white">
              <Check size={12} strokeWidth={3} />
            </span>
          )}
          <div
            className="hidden shrink-0 items-center gap-1 group-focus-within/tab:flex group-hover/tab:flex"
            onPointerDown={(event) => event.stopPropagation()}
          >
            <Menu>
              <MenuTrigger asChild>
                <button
                  type="button"
                  onClick={(event) => event.stopPropagation()}
                  className="flex h-[26px] items-center gap-1 rounded-[7px] bg-subtle px-2 text-[12px] font-semibold text-ink-2 hover:text-ink"
                >
                  {t('common.save')}
                  <ChevronDown size={12} />
                </button>
              </MenuTrigger>
              <MenuContent
                align="end"
                className="min-w-[230px]"
                onClick={(event) => event.stopPropagation()}
              >
                <SaveToMenuItems
                  active={active}
                  onPick={(groupId) =>
                    void saveTabs(source.tabs, { groupId }, { t, settings: active.settings })
                  }
                  onNewGroup={(categoryId) =>
                    void saveTabs(
                      source.tabs,
                      { newGroupIn: categoryId },
                      { t, settings: active.settings },
                    )
                  }
                />
              </MenuContent>
            </Menu>
            <IconButton
              label={t('tab.close')}
              icon={<X size={13} />}
              size="xs"
              variant="soft"
              tooltip={false}
              onClick={(event) => {
                event.stopPropagation()
                void closeTabs([tab.id])
              }}
            />
          </div>
        </div>
      </ContextMenuTrigger>
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
            onSelect={() =>
              void browser.tabs.group({ tabIds: source.tabIds as [number, ...number[]] })
            }
          >
            {t('tab.group')}
          </ContextMenuItem>
        ) : (
          <ContextMenuItem
            icon={<Ungroup size={14} />}
            onSelect={() => void browser.tabs.ungroup(source.tabIds as [number, ...number[]])}
          >
            {t('tab.ungroup')}
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        <ContextMenuItem
          icon={<X size={14} />}
          danger
          onSelect={() => void closeTabs(source.tabIds)}
        >
          {t('tab.close')}
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
