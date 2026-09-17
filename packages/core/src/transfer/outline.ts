import { makeCategory, makeGroup, makeLink, makeNote, makeWorkspace } from '../factories'
import { positionsAtEnd } from '../position'
import { type Item, itemSchema, NOTE_MAX_LENGTH, TITLE_MAX_LENGTH, URL_MAX_LENGTH } from '../schema'
import type { Bundle } from './bundle'

/*
 * Imports from other tools are first parsed into a plain outline (categories → groups → links and
 * notes), then turned into a bundle here, so every importer shares the same limits and checks.
 */

export interface OutlineLink {
  url: string
  title?: string
  note?: string
  createdAt?: number
}

export interface OutlineGroup {
  title: string
  links: OutlineLink[]
  /** Free text that belongs to the group, imported as notes above the links. */
  notes?: string[]
}

export interface OutlineCategory {
  name: string
  groups: OutlineGroup[]
}

export interface Outline {
  categories: OutlineCategory[]
}

export interface OutlineImportOptions {
  now: number
  /** Position of the new workspace. */
  position: string
  workspaceName: string
  workspaceEmoji: string
  /** Used for categories and groups that have no name. */
  categoryName: string
  groupName: string
}

/** Only addresses a browser can open; `javascript:` and friends are dropped. */
export function importableUrl(value: string): string | null {
  const text = value.trim()
  if (!text || text.length > URL_MAX_LENGTH) return null
  return /^(https?|file|ftp|chrome|edge|about):/i.test(text) ? text : null
}

export function outlineLinkCount(outline: Outline): number {
  return outline.categories.reduce(
    (sum, category) => sum + category.groups.reduce((n, group) => n + group.links.length, 0),
    0,
  )
}

/** Merges categories with the same name and drops groups without content. */
function tidy(outline: Outline, options: OutlineImportOptions): OutlineCategory[] {
  const byName = new Map<string, OutlineCategory>()
  for (const category of outline.categories) {
    const name = category.name.trim().slice(0, 80) || options.categoryName
    const groups = category.groups.filter(
      (group) => group.links.length > 0 || (group.notes ?? []).some((note) => note.trim()),
    )
    if (groups.length === 0) continue
    const existing = byName.get(name)
    if (existing) existing.groups.push(...groups)
    else byName.set(name, { name, groups: [...groups] })
  }
  return [...byName.values()]
}

export function outlineToBundle(outline: Outline, options: OutlineImportOptions): Bundle {
  const clock = { now: options.now }
  const workspace = makeWorkspace(
    {
      name: options.workspaceName.slice(0, 80),
      emoji: options.workspaceEmoji,
      position: options.position,
    },
    clock,
  )
  const categories = tidy(outline, options)
  const bundle: Bundle = {
    workspaces: [workspace],
    categories: [],
    groups: [],
    items: [],
    reminders: [],
  }
  const valid = (item: Item) => itemSchema.safeParse(item).success

  const categoryKeys = positionsAtEnd([], Math.max(categories.length, 1))
  categories.forEach((raw, index) => {
    const category = makeCategory(
      { workspaceId: workspace.id, name: raw.name, position: categoryKeys[index]! },
      clock,
    )
    bundle.categories.push(category)
    const groupKeys = positionsAtEnd([], raw.groups.length)
    raw.groups.forEach((rawGroup, groupIndex) => {
      const group = makeGroup(
        {
          categoryId: category.id,
          position: groupKeys[groupIndex]!,
          title: rawGroup.title.trim().slice(0, 120) || options.groupName,
          emoji: '📁',
        },
        clock,
      )
      bundle.groups.push(group)
      const notes = (rawGroup.notes ?? []).map((text) => text.trim()).filter(Boolean)
      const keys = positionsAtEnd([], notes.length + rawGroup.links.length)
      notes.forEach((text, i) => {
        const note = makeNote(
          { groupId: group.id, position: keys[i]!, text: text.slice(0, NOTE_MAX_LENGTH) },
          clock,
        )
        if (valid(note)) bundle.items.push(note)
      })
      rawGroup.links.forEach((raw, i) => {
        const link = makeLink(
          {
            groupId: group.id,
            position: keys[notes.length + i]!,
            url: raw.url,
            title: (raw.title?.trim() || raw.url).slice(0, TITLE_MAX_LENGTH),
            text: (raw.note ?? '').trim().slice(0, NOTE_MAX_LENGTH),
          },
          clock,
        )
        if (raw.createdAt && raw.createdAt > 0 && raw.createdAt <= options.now) {
          link.createdAt = raw.createdAt
        }
        if (valid(link)) bundle.items.push(link)
      })
    })
  })
  if (bundle.categories.length === 0) {
    bundle.categories.push(
      makeCategory(
        { workspaceId: workspace.id, name: options.categoryName, position: categoryKeys[0]! },
        clock,
      ),
    )
  }
  return bundle
}
