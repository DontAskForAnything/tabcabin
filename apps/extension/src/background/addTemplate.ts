import { templateById, type TemplateId } from '@tabcabin/core'
import { seedText } from '@/app/seedText'
import { templateWorkspace } from '@/data/templates'
import { removeStarter, startedWithTemplate } from '@/db/onboarding'
import { createWorkspace } from '@/db/repo'
import { ensureSeed } from '@/db/seed'
import type { Translate } from '@/i18n'
import { translate } from '@/i18n/translate'
import { getSettings, updateSettings } from '@/settings/settings'

/**
 * Adds one of the built-in templates as a new workspace and opens it in a new tab. Returns the
 * workspace name. On a first start the template takes the untouched starter workspace's place,
 * as picking it in the welcome dialog would, and the dialog no longer asks how to start.
 */
export async function addTemplate(id: TemplateId): Promise<string> {
  const { locale } = await getSettings()
  const t: Translate = (key, params) => translate(locale, key, params)
  await ensureSeed(seedText(t))
  await removeStarter()
  const workspace = templateWorkspace(templateById(id), locale, t)
  const created = await createWorkspace(workspace)
  await startedWithTemplate(id)
  const { activeCategoryIds } = await getSettings()
  await updateSettings({
    activeWorkspaceId: created.workspaceId,
    activeCategoryIds: { ...activeCategoryIds, [created.workspaceId]: created.categoryId },
  })
  await browser.tabs.create({ url: browser.runtime.getURL('/newtab.html') })
  return workspace.name
}
