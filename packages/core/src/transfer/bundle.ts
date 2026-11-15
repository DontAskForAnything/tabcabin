import { z } from 'zod'
import type { Clock } from '../factories'
import { newId } from '../ids'
import { mergeTags, TAG_LIMITS } from '../tags'
import {
  type Category,
  categorySchema,
  type Group,
  groupSchema,
  type Item,
  itemSchema,
  type Reminder,
  reminderSchema,
  type Tag,
  tagSchema,
  type Workspace,
  workspaceSchema,
} from '../schema'

/** A set of rows to import or export (one or more complete workspaces). */
export interface Bundle {
  workspaces: Workspace[]
  categories: Category[]
  groups: Group[]
  items: Item[]
  reminders: Reminder[]
  /** Tags on the items (backups made before tags have none). */
  tags?: Tag[]
}

export const BACKUP_FORMAT = 'tabcabin'
/** Backups made before the app was renamed to TabCabin; they import the same way. */
const LEGACY_FORMATS = ['tabhangar'] as const
export const BACKUP_VERSION = 1

const formats = [BACKUP_FORMAT, ...LEGACY_FORMATS] as const

export const backupSchema = z.object({
  format: z.enum(formats),
  version: z.number().int().min(1).max(BACKUP_VERSION),
  exportedAt: z.string(),
  workspaces: z.array(workspaceSchema),
  categories: z.array(categorySchema),
  groups: z.array(groupSchema),
  items: z.array(itemSchema),
  reminders: z.array(reminderSchema).default([]),
  tags: z.array(tagSchema).default([]),
})
export type Backup = z.infer<typeof backupSchema>

const live = <T extends { deletedAt: number | null }>(rows: readonly T[]) =>
  rows.filter((row) => row.deletedAt === null)

/** Live rows of the given workspaces, with children whose parents are gone left out. */
export function collectBundle(all: Bundle, workspaceIds: readonly string[]): Bundle {
  const workspaces = live(all.workspaces).filter((ws) => workspaceIds.includes(ws.id))
  const wsIds = new Set(workspaces.map((ws) => ws.id))
  const categories = live(all.categories).filter((c) => wsIds.has(c.workspaceId))
  const catIds = new Set(categories.map((c) => c.id))
  const groups = live(all.groups).filter((g) => catIds.has(g.categoryId))
  const groupIds = new Set(groups.map((g) => g.id))
  const inGroups = live(all.items).filter((i) => groupIds.has(i.groupId))
  const inGroupIds = new Set(inGroups.map((i) => i.id))
  const items = inGroups.filter((i) => i.parentId === null || inGroupIds.has(i.parentId))
  const itemIds = new Set(items.map((i) => i.id))
  const reminders = live(all.reminders).filter((r) => itemIds.has(r.itemId))
  const tagged = new Set(items.flatMap((item) => item.tagIds ?? []))
  const tags = live(all.tags ?? []).filter((tag) => tagged.has(tag.id))
  return { workspaces, categories, groups, items, reminders, tags }
}

export function createBackup(bundle: Bundle, exportedAt: Date): Backup {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: exportedAt.toISOString(),
    ...bundle,
    tags: bundle.tags ?? [],
  }
}

export function isBackup(value: unknown): boolean {
  return (
    typeof value === 'object' &&
    value !== null &&
    (formats as readonly unknown[]).includes((value as { format?: unknown }).format)
  )
}

/** Validates a backup file; throws a readable error when it is not one. */
export function parseBackup(value: unknown): Bundle {
  const result = backupSchema.safeParse(value)
  if (!result.success) {
    const issue = result.error.issues[0]
    throw new Error(
      `Invalid backup: ${issue?.path.join('.') || 'file'} ${issue?.message ?? ''}`.trim(),
    )
  }
  const { workspaces, categories, groups, items, reminders, tags } = result.data
  return { workspaces, categories, groups, items, reminders, tags }
}

/**
 * Gives every row a new id (keeping the links between them) so a bundle can be imported
 * next to existing data, even twice. Workspaces get the given positions in order.
 */
export function remapBundle(
  bundle: Bundle,
  options: { now: number; workspacePositions: string[] },
): Bundle {
  const ids = new Map<string, string>()
  const id = (old: string) => {
    let next = ids.get(old)
    if (!next) {
      next = newId()
      ids.set(old, next)
    }
    return next
  }
  const stamp = { updatedAt: options.now, deletedAt: null }
  const workspaces = [...bundle.workspaces]
    .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0))
    .map((ws, index) => ({
      ...ws,
      ...stamp,
      id: id(ws.id),
      position: options.workspacePositions[index] ?? ws.position,
    }))
  return {
    workspaces,
    categories: bundle.categories.map((c) => ({
      ...c,
      ...stamp,
      id: id(c.id),
      workspaceId: id(c.workspaceId),
    })),
    groups: bundle.groups.map((g) => ({
      ...g,
      ...stamp,
      id: id(g.id),
      categoryId: id(g.categoryId),
    })),
    items: bundle.items.map((i) => ({
      ...i,
      ...stamp,
      id: id(i.id),
      groupId: id(i.groupId),
      parentId: i.parentId ? id(i.parentId) : null,
    })),
    reminders: bundle.reminders.map((r) => ({
      ...r,
      ...stamp,
      id: id(r.id),
      itemId: id(r.itemId),
    })),
    // Tags keep their ids: `withAccountTags` gives them a place in the account.
    tags: bundle.tags,
  }
}

/**
 * Puts a bundle's tags into an account that already has `existing` ones: a tag with a name the
 * account has becomes that tag, the others are added while there is room (see `mergeTags`), and
 * items lose only the tags that found no place.
 */
export function withAccountTags(bundle: Bundle, existing: readonly Tag[], clock: Clock): Bundle {
  const { added, ids } = mergeTags(bundle.tags ?? [], existing, clock)
  return {
    ...bundle,
    tags: added,
    items: bundle.items.map((item) => {
      if (!item.tagIds) return item
      const tagIds = [...new Set(item.tagIds.flatMap((id) => ids.get(id) ?? []))]
      return { ...item, tagIds: tagIds.slice(0, TAG_LIMITS.perItem) }
    }),
  }
}

export function bundleStats(bundle: Bundle) {
  return {
    workspaces: bundle.workspaces.length,
    categories: bundle.categories.length,
    groups: bundle.groups.length,
    items: bundle.items.filter((item) => item.kind !== 'stack').length,
  }
}
