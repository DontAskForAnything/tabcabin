import { sortByPosition } from '../position'
import type { Item } from '../schema'
import type { Bundle } from './bundle'

interface Tree {
  workspace: Bundle['workspaces'][number]
  categories: {
    category: Bundle['categories'][number]
    groups: { group: Bundle['groups'][number]; items: (Item & { children: Item[] })[] }[]
  }[]
}

/** Workspaces → categories → groups → items, each level in display order. */
export function bundleTree(bundle: Bundle): Tree[] {
  return sortByPosition(bundle.workspaces).map((workspace) => ({
    workspace,
    categories: sortByPosition(bundle.categories.filter((c) => c.workspaceId === workspace.id)).map(
      (category) => ({
        category,
        groups: sortByPosition(bundle.groups.filter((g) => g.categoryId === category.id)).map(
          (group) => {
            const inGroup = bundle.items.filter((i) => i.groupId === group.id)
            return {
              group,
              items: sortByPosition(inGroup.filter((i) => i.parentId === null)).map((item) => ({
                ...item,
                children: sortByPosition(inGroup.filter((c) => c.parentId === item.id)),
              })),
            }
          },
        ),
      }),
    ),
  }))
}

const escapeHtml = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

const seconds = (ms: number) => Math.floor(ms / 1000)

/** Netscape bookmark file (importable by every browser). Notes are left out. */
export function toBookmarksHtml(bundle: Bundle, now: number): string {
  const lines = [
    '<!DOCTYPE NETSCAPE-Bookmark-file-1>',
    '<META HTTP-EQUIV="Content-Type" CONTENT="text/html; charset=UTF-8">',
    '<TITLE>Bookmarks</TITLE>',
    '<H1>Bookmarks</H1>',
    '<DL><p>',
  ]
  const folder = (depth: number, title: string, body: () => void) => {
    const pad = '    '.repeat(depth)
    lines.push(
      `${pad}<DT><H3 ADD_DATE="${seconds(now)}">${escapeHtml(title)}</H3>`,
      `${pad}<DL><p>`,
    )
    body()
    lines.push(`${pad}</DL><p>`)
  }
  const link = (depth: number, item: Item) => {
    if (!item.url) return
    lines.push(
      `${'    '.repeat(depth)}<DT><A HREF="${escapeHtml(item.url)}" ADD_DATE="${seconds(item.createdAt)}">${escapeHtml(item.title || item.url)}</A>`,
    )
  }
  for (const { workspace, categories } of bundleTree(bundle))
    folder(1, `${workspace.emoji} ${workspace.name}`.trim(), () => {
      for (const { category, groups } of categories)
        folder(2, category.name, () => {
          for (const { group, items } of groups)
            folder(3, `${group.emoji} ${group.title}`.trim(), () => {
              for (const item of items) {
                if (item.kind === 'stack')
                  folder(4, item.title || 'Stack', () => item.children.forEach((c) => link(5, c)))
                else link(4, item)
              }
            })
        })
    })
  lines.push('</DL><p>')
  return `${lines.join('\n')}\n`
}

const csvCell = (value: string | number | boolean) => {
  const text = String(value)
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export const CSV_COLUMNS = [
  'Workspace',
  'Category',
  'Group',
  'Type',
  'Title',
  'URL',
  'Note',
  'Done',
  'Created',
] as const

/** One row per link, note, to-do and image (stack children are listed as links). */
export function toCsv(bundle: Bundle): string {
  const rows: (string | number | boolean)[][] = [[...CSV_COLUMNS]]
  for (const { workspace, categories } of bundleTree(bundle))
    for (const { category, groups } of categories)
      for (const { group, items } of groups)
        for (const item of items.flatMap((i) => (i.kind === 'stack' ? i.children : [i]))) {
          const type = item.kind === 'note' ? (item.todo ? 'todo' : 'note') : item.kind
          rows.push([
            workspace.name,
            category.name,
            group.title,
            type,
            item.kind === 'note' ? '' : item.title,
            item.url ?? item.imageUrl ?? '',
            item.text,
            item.todo ? item.done : '',
            new Date(item.createdAt).toISOString(),
          ])
        }
  return `${rows.map((row) => row.map(csvCell).join(',')).join('\r\n')}\r\n`
}
