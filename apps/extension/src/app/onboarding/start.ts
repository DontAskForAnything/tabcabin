import { TEMPLATES, type TemplateId, templateWorkspace } from '@/data/templates'
import { removeStarter } from '@/db/onboarding'
import { createWorkspace } from '@/db/repo'
import type { Translate } from '@/i18n'
import type { Settings } from '@/settings/settings'
import { setActiveCategory } from '../useActive'

export type StartChoice = 'starter' | 'empty' | TemplateId

/**
 * Sets up the board picked in the welcome dialog. The starter workspace is already there; any
 * other start replaces it (unless it has been changed in the meantime, then both stay).
 */
export async function startWith(
  choice: StartChoice,
  { t, settings }: { t: Translate; settings: Settings | undefined },
) {
  if (choice === 'starter') return
  await removeStarter()
  const template = TEMPLATES.find((item) => item.id === choice)
  const created = await createWorkspace(
    template
      ? templateWorkspace(template, t)
      : { name: t('seed.workspace'), emoji: '🏡', categoryName: t('workspace.mainCategory') },
  )
  if (settings) await setActiveCategory(settings, created.workspaceId, created.categoryId)
}
