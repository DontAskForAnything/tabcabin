import { isSavableUrl } from '@tabcabin/core'
import { useMemo } from 'react'
import { usePanel } from './panelStore'
import { type OpenTab, useCurrentWindowId, useOpenTabs, useTabGroups } from './useOpenTabs'

const NONE: OpenTab[] = []

/**
 * Open tabs and tab groups of the window the panel shows (the current one unless picked).
 * `loaded` stays false until the browser has listed the tabs once.
 */
export function usePanelData() {
  const openTabs = useOpenTabs()
  const tabs = openTabs ?? NONE
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
  return { tabs, loaded: openTabs !== null, groups, windowId, currentWindowId, windowIds, inWindow }
}

export type PanelData = ReturnType<typeof usePanelData>
