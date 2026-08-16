import { AppWindow, ChevronDown, Copy, Download, Pin, PinOff, Plus, Search, X } from 'lucide-react'
import { isSavableUrl } from '@tabhangar/core'
import {
  Button,
  IconButton,
  Input,
  Kbd,
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
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocale, useT } from '@/i18n'
import { isTyping } from '@/lib/keys'
import { closeTabs, duplicateTabIds } from '@/lib/tabs'
import { updateSettings } from '@/settings/settings'
import { HangarMark } from '../HangarMark'
import type { ActiveContext } from '../useActive'
import { ChromeGroupBlock } from './ChromeGroupBlock'
import { usePanel } from './panelStore'
import { saveTabs } from './saveTabs'
import { SaveToMenuItems } from './SaveToMenu'
import { TabRow } from './TabRow'
import {
  type ChromeTabGroup,
  type OpenTab,
  useCurrentWindowId,
  useOpenTabs,
  useTabGroups,
} from './useOpenTabs'

type Block =
  { type: 'tab'; tab: OpenTab } | { type: 'group'; group: ChromeTabGroup; tabs: OpenTab[] }

export function usePanelData() {
  const tabs = useOpenTabs()
  const groups = useTabGroups()
  const currentWindowId = useCurrentWindowId()
  const chosen = usePanel((s) => s.windowId)
  const windowId = chosen ?? currentWindowId
  const windowIds = useMemo(
    () => [...new Set(tabs.map((tab) => tab.windowId))].sort((a, b) => a - b),
    [tabs],
  )
  const inWindow = useMemo(
    () =>
      tabs
        .filter((tab) => tab.windowId === windowId && isSavableUrl(tab.url))
        .sort((a, b) => a.index - b.index),
    [tabs, windowId],
  )
  return { tabs, groups, windowId, currentWindowId, windowIds, inWindow }
}

export function PanelBody({
  active,
  onPinChange,
}: {
  active: ActiveContext
  onPinChange?: () => void
}) {
  const t = useT()
  const locale = useLocale()
  const { tabs, groups, windowId, currentWindowId, windowIds, inWindow } = usePanelData()
  const setWindowId = usePanel((s) => s.setWindowId)
  const selected = usePanel((s) => s.selected)
  const clearSelection = usePanel((s) => s.clear)
  const [filter, setFilter] = useState('')
  const filterRef = useRef<HTMLInputElement>(null)
  const pinned = active.settings?.sidebarMode !== 'rail'

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === '/' && !isTyping(event)) {
        event.preventDefault()
        filterRef.current?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const visible = useMemo(() => {
    const q = filter.trim().toLowerCase()
    return q
      ? inWindow.filter(
          (tab) => tab.title.toLowerCase().includes(q) || tab.url.toLowerCase().includes(q),
        )
      : inWindow
  }, [inWindow, filter])

  const blocks = useMemo(() => {
    const result: Block[] = []
    const seen = new Set<number>()
    for (const tab of visible) {
      if (tab.groupId === -1) result.push({ type: 'tab', tab })
      else if (!seen.has(tab.groupId)) {
        seen.add(tab.groupId)
        const group = groups.find((g) => g.id === tab.groupId)
        const members = visible.filter((other) => other.groupId === tab.groupId)
        if (group) result.push({ type: 'group', group, tabs: members })
        else members.forEach((member) => result.push({ type: 'tab', tab: member }))
      }
    }
    return result
  }, [visible, groups])

  const windowLabel = (id: number) =>
    id === currentWindowId
      ? t('panel.thisWindow')
      : t('panel.windowN', { n: windowIds.indexOf(id) + 1 })
  const sessionTitle = t('panel.sessionTitle', {
    date: new Date().toLocaleDateString(locale, { day: 'numeric', month: 'short' }),
  })
  const selectionTabs = inWindow.filter((tab) => selected.includes(tab.id))
  const actionTabs = selectionTabs.length ? selectionTabs : inWindow

  return (
    <div className="flex h-full min-h-0 flex-col gap-3.5 px-3.5 pt-[18px] pb-4">
      <div className="flex items-center gap-2.5 px-1">
        <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-accent text-white shadow-glow">
          <HangarMark size={19} />
        </span>
        <span className="flex-1 text-[16px] font-semibold tracking-[-0.02em]">TabHangar</span>
        <IconButton
          label={pinned ? t('panel.unpin') : t('panel.pin')}
          icon={pinned ? <PinOff size={15} /> : <Pin size={15} />}
          variant={pinned ? 'accent' : 'soft'}
          size="md"
          onClick={() => {
            void updateSettings({ sidebarMode: pinned ? 'rail' : 'pinned' })
            onPinChange?.()
          }}
        />
      </div>

      <div className="flex gap-2">
        <Menu>
          <MenuTrigger asChild>
            <button
              type="button"
              className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-[10px] bg-card px-2.5 text-[13px] font-medium shadow-tile"
            >
              <span className="size-2 shrink-0 rounded-full bg-success" />
              <span className="flex-1 truncate text-left">
                {windowId !== null ? windowLabel(windowId) : '…'} ·{' '}
                {t('panel.windowTabs', { count: inWindow.length })}
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
                {windowLabel(id)} ·{' '}
                {t('panel.windowTabs', { count: tabs.filter((tab) => tab.windowId === id).length })}
              </MenuItem>
            ))}
            <MenuSeparator />
            <MenuItem
              icon={<Plus size={14} />}
              onSelect={() => void browser.windows.create({ focused: true })}
            >
              {t('panel.newWindow')}
            </MenuItem>
          </MenuContent>
        </Menu>
        <IconButton
          label={t('panel.newWindow')}
          icon={<Plus size={16} />}
          variant="tile"
          size="md"
          onClick={() => void browser.windows.create({ focused: true })}
        />
      </div>

      <Input
        ref={filterRef}
        leading={<Search size={15} />}
        trailing={
          filter ? (
            <IconButton
              label={t('common.close')}
              icon={<X size={13} />}
              size="xs"
              tooltip={false}
              onClick={() => setFilter('')}
            />
          ) : (
            <Kbd className="bg-card">/</Kbd>
          )
        }
        placeholder={t('panel.filter')}
        value={filter}
        onChange={(event) => setFilter(event.target.value)}
        onKeyDown={(event) => event.key === 'Escape' && (setFilter(''), event.currentTarget.blur())}
        className="h-9"
      />

      <div className="-mx-1 flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto px-1">
        {blocks.map((block) =>
          block.type === 'tab' ? (
            <TabRow key={block.tab.id} tab={block.tab} allTabs={inWindow} active={active} />
          ) : (
            <ChromeGroupBlock
              key={`g${block.group.id}`}
              group={block.group}
              tabs={block.tabs}
              allTabs={inWindow}
              active={active}
            />
          ),
        )}
        {blocks.length === 0 && (
          <p className="px-2 py-6 text-center text-[13px] text-ink-3">{t('panel.noTabs')}</p>
        )}
      </div>

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
                actionTabs,
                { newGroupIn: active.category.id, title: sessionTitle, emoji: '🗂️' },
                { t, settings: active.settings },
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
                onPick={(groupId) =>
                  void saveTabs(actionTabs, { groupId }, { t, settings: active.settings }).then(
                    clearSelection,
                  )
                }
                onNewGroup={(categoryId) =>
                  void saveTabs(
                    actionTabs,
                    { newGroupIn: categoryId },
                    { t, settings: active.settings },
                  ).then(clearSelection)
                }
              />
            </MenuSubContent>
          </MenuSub>
          <MenuSeparator />
          <MenuLabel>{windowId !== null ? windowLabel(windowId) : ''}</MenuLabel>
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
    </div>
  )
}
