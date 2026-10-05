import type { Category, Workspace } from '@tabcabin/core'
import { useCategories, useWorkspaces } from '@/db/hooks'
import { type Settings, updateSettings, useSettings } from '@/settings/settings'
import { useUi } from '@/state/ui'

export interface ActiveContext {
  settings: Settings | undefined
  workspaces: Workspace[] | undefined
  workspace: Workspace | undefined
  categories: Category[] | undefined
  category: Category | undefined
  ready: boolean
}

export function useActive(): ActiveContext {
  const settings = useSettings()
  const workspaces = useWorkspaces()
  const workspace =
    workspaces?.find((ws) => ws.id === settings?.activeWorkspaceId) ?? workspaces?.[0]
  const categories = useCategories(workspace?.id)
  const activeCategoryId = workspace ? settings?.activeCategoryIds[workspace.id] : undefined
  const category = categories?.find((cat) => cat.id === activeCategoryId) ?? categories?.[0]
  return {
    settings,
    workspaces,
    workspace,
    categories,
    category,
    ready: settings !== undefined && workspaces !== undefined && categories !== undefined,
  }
}

export async function setActiveWorkspace(workspaceId: string) {
  await updateSettings({ activeWorkspaceId: workspaceId })
}

export async function setActiveCategory(
  settings: Settings,
  workspaceId: string,
  categoryId: string,
) {
  await updateSettings({
    activeWorkspaceId: workspaceId,
    activeCategoryIds: { ...settings.activeCategoryIds, [workspaceId]: categoryId },
  })
}

/** Switches to the item's category and highlights the item on the board. */
export async function revealItem(
  settings: Settings,
  target: { workspaceId: string; categoryId: string; itemId: string },
) {
  await setActiveCategory(settings, target.workspaceId, target.categoryId)
  setTimeout(() => useUi.getState().flashItem(target.itemId), 120)
}
