import { makeCategory, makeGroup, makeItem, makeWorkspace } from '../factories'
import { positionsAtEnd } from '../position'
import {
  type Category,
  type Group,
  type Item,
  itemSchema,
  NOTE_MAX_LENGTH,
  type NoteColor,
  TITLE_MAX_LENGTH,
  URL_MAX_LENGTH,
} from '../schema'
import type { Bundle } from './bundle'

/*
 * Importer for tabExtend JSON exports: `{ categories, tabData }` (current) or a plain array of
 * groups (older exports). Every id is regenerated; unknown fields are ignored.
 */

type Raw = Record<string, unknown>

const isObject = (value: unknown): value is Raw =>
  typeof value === 'object' && value !== null && !Array.isArray(value)
const str = (value: unknown, max = 10_000) => (typeof value === 'string' ? value.slice(0, max) : '')
const list = (value: unknown): Raw[] => (Array.isArray(value) ? value.filter(isObject) : [])

/** tabExtend stores note colors as an index into its palette. */
const COLORS: (NoteColor | null)[] = [
  'rose',
  'amber',
  'lime',
  'peach',
  'pink',
  'lilac',
  'sky',
  'sky',
  'teal',
  'lime',
  'amber',
  null,
]

function color(value: unknown): NoteColor | null {
  return typeof value === 'number' ? (COLORS[value] ?? null) : null
}

function url(value: unknown): string | null {
  const text = str(value, URL_MAX_LENGTH + 1).trim()
  if (!text || text.length > URL_MAX_LENGTH) return null
  return /^(https?|file|ftp|chrome|edge|about):/i.test(text) ? text : null
}

function favicon(value: unknown): string | null {
  const text = url(value)
  return text && /^https?:/i.test(text) ? text : null
}

function created(raw: Raw, now: number): number {
  const parsed = Date.parse(str(raw.dateCreated) || str(raw.lastAdded))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : now
}

export function isTabExtendExport(value: unknown): boolean {
  const groups = Array.isArray(value) ? value : isObject(value) ? value.tabData : undefined
  return Array.isArray(groups) && groups.every((g) => isObject(g) && Array.isArray(g.tabs))
}

export interface TabExtendImportOptions {
  now: number
  /** Position of the new workspace. */
  position: string
  workspaceName: string
  /** Name for the category used by old exports without categories. */
  categoryName: string
}

export function importTabExtend(value: unknown, options: TabExtendImportOptions): Bundle {
  if (!isTabExtendExport(value)) throw new Error('Not a tabExtend export')
  const clock = { now: options.now }
  const rawGroups = Array.isArray(value) ? list(value) : list((value as Raw).tabData)
  const rawCategories = Array.isArray(value) ? [] : list((value as Raw).categories)

  const workspace = makeWorkspace(
    { name: options.workspaceName.slice(0, 80), emoji: '📦', position: options.position },
    clock,
  )

  const sortedCategories = [...rawCategories].sort(
    (a, b) => (Number(a.tabIndex) || 0) - (Number(b.tabIndex) || 0),
  )
  const catKeys = positionsAtEnd([], Math.max(sortedCategories.length, 1))
  const categories: Category[] = []
  const categoryIds = new Map<string, string>()
  sortedCategories.forEach((raw, index) => {
    const category = makeCategory(
      {
        workspaceId: workspace.id,
        name: str(raw.name, 80) || options.categoryName,
        position: catKeys[index]!,
      },
      clock,
    )
    categories.push(category)
    categoryIds.set(str(raw.id), category.id)
  })
  const fallback = () => {
    if (categories.length === 0)
      categories.push(
        makeCategory(
          { workspaceId: workspace.id, name: options.categoryName, position: catKeys[0]! },
          clock,
        ),
      )
    return categories[0]!.id
  }

  const groups: Group[] = []
  const items: Item[] = []
  const groupKeys = new Map<string, string[]>()
  const nextGroupKey = (categoryId: string) => {
    const count = rawGroups.length
    if (!groupKeys.has(categoryId)) groupKeys.set(categoryId, positionsAtEnd([], count))
    return groupKeys.get(categoryId)!.shift()!
  }

  for (const rawGroup of rawGroups) {
    const categoryId = categoryIds.get(str(rawGroup.categoryID)) ?? fallback()
    const width = Number(rawGroup.customWidth)
    const group = makeGroup(
      {
        categoryId,
        position: nextGroupKey(categoryId),
        title: str(rawGroup.title, 120),
        emoji: str(rawGroup.emoji, 32) || '📁',
        collapsed: rawGroup.collapsed === true,
        width:
          Number.isFinite(width) && width > 0 && Math.round(width) !== 367
            ? Math.min(1200, Math.max(240, Math.round(width)))
            : null,
      },
      clock,
    )
    groups.push(group)
    const rawItems = list(rawGroup.tabs)
    const keys = positionsAtEnd([], rawItems.length)
    rawItems.forEach((raw, index) => {
      items.push(...convertItem(raw, group.id, keys[index]!, options.now))
    })
  }
  if (categories.length === 0) fallback()

  return { workspaces: [workspace], categories, groups, items, reminders: [] }
}

function convertItem(raw: Raw, groupId: string, position: string, now: number): Item[] {
  const clock = { now }
  const base = {
    groupId,
    position,
    title: str(raw.title, TITLE_MAX_LENGTH),
    text: str(raw.comment, NOTE_MAX_LENGTH),
    color: color(raw.commentColor),
    emoji: str(raw.emoji, 32) || null,
    createdAt: created(raw, now),
  }
  const valid = (item: Item) => itemSchema.safeParse(item).success

  if (raw.isStacked === true) {
    const stack = makeItem({ ...base, kind: 'stack' }, clock)
    const children = list(raw.stackedItems)
    const keys = positionsAtEnd([], children.length)
    const links = children.flatMap((child, index) => {
      const link = convertItem(child, groupId, keys[index]!, now)[0]
      return link && link.kind === 'link' ? [{ ...link, parentId: stack.id }] : []
    })
    if (links.length === 0) return []
    return [stack, ...links].filter(valid)
  }

  const address = url(raw.url)
  if (raw.type === 'image' || (raw.imageUrl && !raw.note)) {
    const image = url(raw.imageUrl) ?? address
    if (!image) return []
    const item = makeItem({ ...base, kind: 'image', imageUrl: image, url: address }, clock)
    return valid(item) ? [item] : []
  }

  // A link whose address can't be used (e.g. `javascript:`) is dropped rather than turned into a note.
  if (raw.note !== true && str(raw.url).trim() && !address) return []
  if (raw.note === true || !address) {
    if (!base.text.trim() && !base.title.trim()) return []
    const item = makeItem(
      {
        ...base,
        kind: 'note',
        title: raw.type === 'textCopied' ? base.title : '',
        text: base.text || base.title,
        todo: raw.todo === true,
        done: raw.todo === true && raw.doneStatus === true,
        sourceUrl: raw.type === 'textCopied' ? address : null,
      },
      clock,
    )
    return valid(item) ? [item] : []
  }

  const item = makeItem(
    {
      ...base,
      kind: 'link',
      title: base.title || address,
      url: address,
      favIconUrl: favicon(raw.favIcon),
      metaImageUrl: favicon(raw.metaUrl),
    },
    clock,
  )
  return valid(item) ? [item] : []
}
