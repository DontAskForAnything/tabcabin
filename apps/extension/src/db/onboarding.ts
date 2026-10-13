import { type Change, purge } from '@tabcabin/core'
import { applyChanges } from './apply'
import { db } from './db'

/**
 * The welcome dialog. The first start opens it next to the starter workspace; finishing or
 * closing it marks it done. Installs from before it existed have no row and never see it.
 */
export const ONBOARDING_KEY = 'onboarding'

export type Onboarding = { state: 'open'; starterId: string; seededAt: number } | { state: 'done' }

export async function getOnboarding(): Promise<Onboarding | null> {
  const row = await db.meta.get(ONBOARDING_KEY)
  return (row?.value as Onboarding | undefined) ?? null
}

/** Opens the welcome dialog for a starter workspace, unless it was already seen. */
export async function openOnboarding(starterId: string, seededAt: number) {
  if (await db.meta.get(ONBOARDING_KEY)) return
  const value: Onboarding = { state: 'open', starterId, seededAt }
  await db.meta.put({ key: ONBOARDING_KEY, value })
}

export async function finishOnboarding() {
  const value: Onboarding = { state: 'done' }
  await db.meta.put({ key: ONBOARDING_KEY, value })
}

/**
 * Removes the starter workspace when the user starts differently, but only while nothing in it
 * has changed since it was created. Returns whether it was removed.
 */
export async function removeStarter(): Promise<boolean> {
  const onboarding = await getOnboarding()
  if (onboarding?.state !== 'open') return false
  const { starterId, seededAt } = onboarding
  const workspace = await db.workspaces.get(starterId)
  if (!workspace) return false
  const categories = await db.categories.where('workspaceId').equals(starterId).toArray()
  const groups = await db.groups
    .where('categoryId')
    .anyOf(categories.map((row) => row.id))
    .toArray()
  const items = await db.items
    .where('groupId')
    .anyOf(groups.map((row) => row.id))
    .toArray()
  const reminders = await db.reminders
    .where('itemId')
    .anyOf(items.map((row) => row.id))
    .toArray()
  const rows = [workspace, ...categories, ...groups, ...items, ...reminders]
  if (reminders.length > 0 || rows.some((row) => row.updatedAt > seededAt)) return false

  const changes: Change[] = [
    ...items.map((row) => purge('item', row.id)),
    ...groups.map((row) => purge('group', row.id)),
    ...categories.map((row) => purge('category', row.id)),
    purge('workspace', starterId),
  ]
  await applyChanges(changes)
  return true
}
