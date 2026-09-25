import { useDraggable } from '@dnd-kit/core'
import { ChevronDown } from 'lucide-react'
import { cn, Menu, MenuContent, MenuTrigger } from '@tabhangar/ui'
import { useT } from '@/i18n'
import { useDrag } from '../dnd/store'
import type { DragSource } from '../dnd/types'
import type { ActiveContext } from '../useActive'
import { usePanel } from './panelStore'
import { saveTabs } from './saveTabs'
import { SaveToMenuItems } from './SaveToMenu'
import { TabRow } from './tab/TabRow'
import { type ChromeTabGroup, TAB_GROUP_COLORS, type OpenTab } from './useOpenTabs'

export function ChromeGroupBlock({
  group,
  tabs,
  allTabs,
  active,
}: {
  group: ChromeTabGroup
  tabs: OpenTab[]
  allTabs: OpenTab[]
  active: ActiveContext
}) {
  const t = useT()
  const collapsed = usePanel((s) => s.collapsedGroups.includes(group.id))
  const toggleGroup = usePanel((s) => s.toggleGroup)
  const title = group.title || t('tab.groupUntitled')
  const source: DragSource = {
    kind: 'tabs',
    tabIds: tabs.map((tab) => tab.id),
    tabs: tabs.map((tab) => ({
      id: tab.id,
      url: tab.url,
      title: tab.title,
      favIconUrl: tab.favIconUrl,
    })),
  }
  const { setNodeRef, listeners } = useDraggable({
    id: `chrome-group:${group.id}`,
    data: {
      source,
      overlay: {
        kind: 'tab',
        title,
        subtitle: t('panel.windowTabs', { count: tabs.length }),
        count: tabs.length,
      },
    },
  })
  const firstId = tabs[0]?.id ?? -1
  const dragging = useDrag(
    (s) =>
      s.source?.kind === 'tabs' &&
      s.source.tabIds.includes(firstId) &&
      s.source.tabIds.length === tabs.length,
  )
  const [light, dark] = TAB_GROUP_COLORS[group.color] ?? TAB_GROUP_COLORS.grey!

  return (
    <div className={cn('flex flex-col gap-0.5', dragging && 'opacity-40')}>
      <div
        ref={setNodeRef}
        {...listeners}
        className="group/cg mt-1 flex cursor-grab items-center gap-2 rounded-[10px] px-2 py-1.5 text-[12.5px] font-semibold hover:bg-card"
      >
        <span
          className="size-2.5 shrink-0 rounded-[4px] bg-[rgb(var(--cg-light))] dark:bg-[rgb(var(--cg-dark))]"
          style={{ ['--cg-light' as string]: light, ['--cg-dark' as string]: dark }}
        />
        <button
          type="button"
          onClick={() => toggleGroup(group.id)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left text-ink-2"
        >
          <span className="truncate">{title}</span>
          <span className="font-medium text-ink-3">{tabs.length}</span>
          <ChevronDown
            size={13}
            className={cn('shrink-0 text-ink-3 transition-transform', collapsed && '-rotate-90')}
          />
        </button>
        <div
          className="hidden group-focus-within/cg:block group-hover/cg:block"
          onPointerDown={(event) => event.stopPropagation()}
        >
          <Menu>
            <MenuTrigger asChild>
              <button
                type="button"
                className="h-6 rounded-[7px] bg-subtle px-2 text-[11.5px] font-semibold text-ink-2 hover:text-ink"
              >
                {t('tab.saveGroup')}
              </button>
            </MenuTrigger>
            <MenuContent align="end" className="min-w-[230px]">
              <SaveToMenuItems
                active={active}
                onPick={(groupId) =>
                  void saveTabs(source.tabs, { groupId }, { t, settings: active.settings })
                }
                onNewGroup={(categoryId) =>
                  void saveTabs(
                    source.tabs,
                    { newGroupIn: categoryId, title },
                    { t, settings: active.settings },
                  )
                }
              />
            </MenuContent>
          </Menu>
        </div>
      </div>
      {!collapsed &&
        tabs.map((tab) => (
          <TabRow key={tab.id} tab={tab} allTabs={allTabs} active={active} nested />
        ))}
    </div>
  )
}
