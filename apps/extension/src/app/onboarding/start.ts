import { removeStarter } from '@/db/onboarding'
import { createWorkspace } from '@/db/repo'
import type { Settings } from '@/settings/settings'
import { setActiveCategory } from '../useActive'

export type StartChoice = 'starter' | 'empty'

/**
 * Sets up the board picked in the welcome dialog. The starter workspace is already there; any
 * other start replaces it (unless it has been changed in the meantime, then both stay).
 */
export async function startWith(
  choice: StartChoice,
  input: { workspace: string; category: string; settings: Settings | undefined },
) {
  if (choice === 'starter') return
  await removeStarter()
  const created = await createWorkspace({
    name: input.workspace,
    emoji: '🏡',
    categoryName: input.category,
  })
  if (input.settings)
    await setActiveCategory(input.settings, created.workspaceId, created.categoryId)
}
