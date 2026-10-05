import { displayHost } from '@tabcabin/core'
import { useEffect, useState } from 'react'
import type { PopoverData } from '@/background/popover'
import type { PageInfo, Target } from './types'

/** Boards and settings from the background, and a sensible first target for the page. */
export function usePopoverData(page: PageInfo) {
  const [data, setData] = useState<PopoverData | null>(null)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [target, setTarget] = useState<Target | null>(null)

  useEffect(() => {
    void browser.runtime
      .sendMessage({ type: 'tabhangar:popover-data', url: page.url })
      .then((response: PopoverData) => {
        setData(response)
        setWorkspaceId(response.activeWorkspaceId)
        const ws =
          response.workspaces.find((w) => w.id === response.activeWorkspaceId) ??
          response.workspaces[0]
        const category =
          ws?.categories.find((c) => c.id === response.activeCategoryId) ?? ws?.categories[0]
        const group = category?.groups[0]
        if (group) setTarget({ groupId: group.id })
        else if (category) setTarget({ newGroupIn: category.id, title: displayHost(page.url) })
      })
  }, [page.url])

  const workspace = data?.workspaces.find((ws) => ws.id === workspaceId) ?? data?.workspaces[0]
  return { data, workspace, setWorkspaceId, target, setTarget }
}
