import { isTemplateId, templateById } from '@tabcabin/core'
import { seedText } from '@/app/seedText'
import { templateWorkspace } from '@/data/templates'
import { createWorkspace } from '@/db/repo'
import { ensureSeed } from '@/db/seed'
import type { Translate } from '@/i18n'
import { translate } from '@/i18n/translate'
import { getSettings, updateSettings } from '@/settings/settings'

/**
 * What the website may ask (manifest `externally_connectable` lets only TabCabin's own site
 * talk to the extension): whether TabCabin is installed, and to add one of the built-in
 * templates. It sends a template id and nothing else, so a page can never put its own content
 * into someone's boards.
 */
export type SiteReply =
  | { ok: true; version: string }
  | { ok: true; workspace: string }
  | { ok: false; error: 'unknown-message' | 'unknown-template' | 'failed' }

export async function handleSiteMessage(message: unknown): Promise<SiteReply> {
  const type = (message as { type?: unknown } | null)?.type
  if (type === 'tabcabin:hello') return { ok: true, version: browser.runtime.getManifest().version }
  if (type !== 'tabcabin:add-template') return { ok: false, error: 'unknown-message' }
  const id = (message as { id?: unknown }).id
  if (!isTemplateId(id)) return { ok: false, error: 'unknown-template' }

  const { locale } = await getSettings()
  const t: Translate = (key, params) => translate(locale, key, params)
  // On a first start the starter board comes first, as it would when the new tab opens, so it
  // does not take the template's place afterwards.
  await ensureSeed(seedText(t))
  const workspace = templateWorkspace(templateById(id), locale, t)
  const created = await createWorkspace(workspace)
  const { activeCategoryIds } = await getSettings()
  await updateSettings({
    activeWorkspaceId: created.workspaceId,
    activeCategoryIds: { ...activeCategoryIds, [created.workspaceId]: created.categoryId },
  })
  await browser.tabs.create({ url: browser.runtime.getURL('/newtab.html') })
  return { ok: true, workspace: workspace.name }
}
