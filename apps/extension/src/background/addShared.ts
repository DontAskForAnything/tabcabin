import { copySharedGroup, positionAtIndex, sharedGroupSchema } from '@tabcabin/core'
import { seedText } from '@/app/seedText'
import * as repo from '@/db/repo'
import { clock } from '@/db/repo/commit'
import { ensureSeed } from '@/db/seed'
import type { Translate } from '@/i18n'
import { translate } from '@/i18n/translate'
import { getSettings, updateSettings } from '@/settings/settings'
import { getSyncServer } from '@/sync/server'

/** The link no longer works: sharing stopped, or the group was deleted. */
export class SharedGone extends Error {}
/** This copy of TabCabin was built without a sync server, so it can't read shared groups. */
export class NoSyncServer extends Error {}

/** The workspace and category the board showed last (where a new tab opens). */
async function lastPlace(): Promise<{ workspaceId: string; categoryId: string }> {
  const settings = await getSettings()
  const workspaces = await repo.getWorkspaces()
  const workspace = workspaces.find((ws) => ws.id === settings.activeWorkspaceId) ?? workspaces[0]
  const categories = workspace ? await repo.getCategories(workspace.id) : []
  const category =
    categories.find((cat) => cat.id === settings.activeCategoryIds[workspace?.id ?? '']) ??
    categories[0]
  if (!workspace || !category) throw new Error('No board to add the group to')
  return { workspaceId: workspace.id, categoryId: category.id }
}

/**
 * Copies a group someone shared to the top of the board shown last and opens it in a new tab;
 * returns its title. The group is read from this TabCabin's own sync server, so the website only
 * names it and never puts content of its own into the board.
 */
export async function addShared(id: string): Promise<string> {
  const server = await getSyncServer()
  if (!server) throw new NoSyncServer()
  const res = await fetch(`${server}/shared/${encodeURIComponent(id)}`, { cache: 'no-store' })
  if (res.status === 404) throw new SharedGone()
  if (!res.ok) throw new Error(`The shared group did not load (${res.status})`)
  const shared = sharedGroupSchema.parse(((await res.json()) as { group?: unknown }).group)

  const { locale } = await getSettings()
  const t: Translate = (key, params) => translate(locale, key, params)
  await ensureSeed(seedText(t))
  const { workspaceId, categoryId } = await lastPlace()
  const position = positionAtIndex(await repo.getGroups(categoryId), 0)
  const { group, items } = copySharedGroup(shared, { categoryId, position }, clock())
  await repo.insertGroup(group, items)

  const { activeCategoryIds } = await getSettings()
  await updateSettings({
    activeWorkspaceId: workspaceId,
    activeCategoryIds: { ...activeCategoryIds, [workspaceId]: categoryId },
  })
  await browser.tabs.create({ url: browser.runtime.getURL('/newtab.html') })
  return group.title
}
