import {
  type Bundle,
  bundleStats,
  collectBundle,
  createBackup,
  importTabExtend,
  isBackup,
  isBookmarksHtml,
  isOneTabExport,
  isSavableUrl,
  isTabExtendExport,
  isTobyExport,
  isUrlList,
  type Outline,
  outlineLinkCount,
  outlineToBundle,
  parseBackup,
  parseBookmarksHtml,
  parseToby,
  parseUrlList,
  positionsAtEnd,
  puts,
  remapBundle,
  TITLE_MAX_LENGTH,
  toBookmarksHtml,
  toCsv,
} from '@tabhangar/core'
import { applyChanges } from '@/db/apply'
import { db } from '@/db/db'
import { addLinks, createGroup, getWorkspaces, type Result } from '@/db/repo'

export type ExportFormat = 'json' | 'html' | 'csv'

/** Lets spreadsheet apps detect UTF-8 in CSV files. */
const BOM = '\uFEFF'

async function loadAll(): Promise<Bundle> {
  const [workspaces, categories, groups, items, reminders] = await Promise.all([
    db.workspaces.toArray(),
    db.categories.toArray(),
    db.groups.toArray(),
    db.items.toArray(),
    db.reminders.toArray(),
  ])
  return { workspaces, categories, groups, items, reminders }
}

const slug = (text: string) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'workspace'

/** Builds an export file of the given workspaces (all of them when `workspaceIds` is null). */
export async function buildExport(
  format: ExportFormat,
  workspaceIds: string[] | null,
  now = new Date(),
): Promise<{ filename: string; mime: string; content: string }> {
  const all = await loadAll()
  const ids = workspaceIds ?? all.workspaces.map((ws) => ws.id)
  const bundle = collectBundle(all, ids)
  const date = now.toISOString().slice(0, 10)
  const name =
    workspaceIds && bundle.workspaces.length === 1
      ? `tabhangar-${slug(bundle.workspaces[0]!.name)}-${date}`
      : `tabhangar-${date}`
  if (format === 'json')
    return {
      filename: `${name}.json`,
      mime: 'application/json',
      content: `${JSON.stringify(createBackup(bundle, now), null, 2)}\n`,
    }
  if (format === 'html')
    return {
      filename: `${name}-bookmarks.html`,
      mime: 'text/html',
      content: toBookmarksHtml(bundle, now.getTime()),
    }
  return { filename: `${name}.csv`, mime: 'text/csv', content: `${BOM}${toCsv(bundle)}` }
}

export function downloadFile(file: { filename: string; mime: string; content: string }) {
  const url = URL.createObjectURL(new Blob([file.content], { type: `${file.mime};charset=utf-8` }))
  const link = document.createElement('a')
  link.href = url
  link.download = file.filename
  document.body.append(link)
  link.click()
  link.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export class ImportError extends Error {}

export interface ImportResult {
  workspaceId: string
  workspaces: number
  groups: number
  items: number
}

/** Names for what an import creates, in the user's language. */
export interface ImportNames {
  tabExtend: string
  toby: string
  bookmarks: string
  oneTab: string
  links: string
  category: string
  group: string
}

/**
 * Imports a file into new workspaces: a TabHangar backup, a tabExtend or Toby JSON export, a
 * bookmarks HTML file (browsers, Toby, Raindrop…) or a plain list of links (OneTab, Toby TXT).
 */
export async function importFile(
  text: string,
  names: ImportNames,
  now = Date.now(),
): Promise<ImportResult> {
  const [position] = positionsAtEnd(await getWorkspaces(), 1)
  const fromOutline = (outline: Outline, workspaceName: string, workspaceEmoji: string) => {
    if (outlineLinkCount(outline) === 0) throw new ImportError('no links found')
    return outlineToBundle(outline, {
      now,
      position: position!,
      workspaceName,
      workspaceEmoji,
      categoryName: names.category,
      groupName: names.group,
    })
  }

  let bundle: Bundle
  const trimmed = text.trimStart()
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    let value: unknown
    try {
      value = JSON.parse(text)
    } catch {
      throw new ImportError('invalid JSON')
    }
    if (isBackup(value)) {
      let parsed: Bundle
      try {
        parsed = parseBackup(value)
      } catch (error) {
        throw new ImportError((error as Error).message)
      }
      const positions = positionsAtEnd(await getWorkspaces(), parsed.workspaces.length)
      bundle = remapBundle(parsed, { now, workspacePositions: positions })
    } else if (isTabExtendExport(value)) {
      bundle = importTabExtend(value, {
        now,
        position: position!,
        workspaceName: names.tabExtend,
        categoryName: names.category,
      })
    } else if (isTobyExport(value)) {
      bundle = fromOutline(parseToby(value), names.toby, '📚')
    } else {
      throw new ImportError('unknown format')
    }
  } else if (isBookmarksHtml(text)) {
    bundle = fromOutline(parseBookmarksHtml(text), names.bookmarks, '🔖')
  } else if (isUrlList(text)) {
    const name = isOneTabExport(text) ? names.oneTab : names.links
    bundle = fromOutline(parseUrlList(text), name, '📥')
  } else {
    throw new ImportError('unknown format')
  }
  if (bundle.workspaces.length === 0) throw new ImportError('no workspaces')
  await applyChanges([
    ...puts('workspace', bundle.workspaces),
    ...puts('category', bundle.categories),
    ...puts('group', bundle.groups),
    ...puts('item', bundle.items),
    ...puts('reminder', bundle.reminders),
  ])
  const stats = bundleStats(bundle)
  return {
    workspaceId: bundle.workspaces[0]!.id,
    workspaces: stats.workspaces,
    groups: stats.groups,
    items: stats.items,
  }
}

/** Adds a group with the given links to a category (one undoable change). */
export async function addGroupWithLinks(
  categoryId: string,
  group: { title: string; emoji: string },
  links: { url: string; title: string }[],
): Promise<Result & { groupId: string; count: number }> {
  const usable = links.filter((link) => isSavableUrl(link.url))
  const created = await createGroup(categoryId, group)
  const added = await addLinks(
    created.groupId,
    usable.map((link) => ({
      url: link.url,
      title: (link.title || link.url).slice(0, TITLE_MAX_LENGTH),
    })),
  )
  return { undo: [...added.undo, ...created.undo], groupId: created.groupId, count: usable.length }
}

export interface BookmarkFolder {
  id: string
  title: string
  depth: number
  /** Links in this folder and its subfolders. */
  links: { url: string; title: string }[]
}

/** Bookmark folders that contain links, in tree order. */
export async function loadBookmarkFolders(): Promise<BookmarkFolder[]> {
  const tree = await browser.bookmarks.getTree()
  const folders: BookmarkFolder[] = []
  const walk = (
    node: Browser.bookmarks.BookmarkTreeNode,
    depth: number,
  ): BookmarkFolder['links'] => {
    const links: BookmarkFolder['links'] = []
    const entry: BookmarkFolder = { id: node.id, title: node.title, depth, links }
    if (depth >= 0) folders.push(entry)
    for (const child of node.children ?? []) {
      if (child.url) links.push({ url: child.url, title: child.title })
      else links.push(...walk(child, depth + 1))
    }
    return links
  }
  for (const root of tree) walk(root, -1)
  return folders.filter((folder) => folder.links.length > 0)
}

export async function loadTopSites(): Promise<{ url: string; title: string }[]> {
  return (await browser.topSites.get()).map((site) => ({ url: site.url, title: site.title }))
}
