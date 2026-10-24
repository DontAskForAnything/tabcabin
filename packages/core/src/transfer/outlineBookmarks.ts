import { escapeHtml } from './exporters'
import { importableUrl, type Outline, type OutlineLink } from './outline'

export interface OutlineBookmarksOptions {
  /** The folder everything goes into. */
  folder: string
  /** For groups without a name, numbered when there are several. */
  groupName: string
  now: number
}

const seconds = (ms: number) => Math.floor(ms / 1000)

/**
 * An outline (a OneTab list, a Toby export, any list of links) as a bookmarks file every browser
 * can import: one folder, a folder per space when there are several, and a folder per group.
 * A single list without a name goes straight into the folder. Notes are left out.
 */
export function outlineToBookmarksHtml(outline: Outline, options: OutlineBookmarksOptions): string {
  const categories = outline.categories
    .map((category) => ({
      name: category.name.trim(),
      groups: category.groups
        .map((group) => ({
          title: group.title.trim(),
          links: group.links.filter((link) => importableUrl(link.url)),
        }))
        .filter((group) => group.links.length > 0),
    }))
    .filter((category) => category.groups.length > 0)
  const groupCount = categories.reduce((sum, category) => sum + category.groups.length, 0)
  const unnamed = categories.flatMap((c) => c.groups).filter((group) => !group.title).length
  const bySpace = categories.length > 1

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
      `${pad}<DT><H3 ADD_DATE="${seconds(options.now)}">${escapeHtml(title)}</H3>`,
      `${pad}<DL><p>`,
    )
    body()
    lines.push(`${pad}</DL><p>`)
  }
  const link = (depth: number, { url, title, createdAt }: OutlineLink) =>
    lines.push(
      `${'    '.repeat(depth)}<DT><A HREF="${escapeHtml(url.trim())}" ADD_DATE="${seconds(createdAt ?? options.now)}">${escapeHtml(title?.trim() || url.trim())}</A>`,
    )

  let number = 0
  const groupName = (title: string) =>
    title || (unnamed > 1 ? `${options.groupName} ${++number}` : options.groupName)

  folder(1, options.folder.trim() || options.groupName, () => {
    if (groupCount === 1 && !categories[0]!.groups[0]!.title) {
      categories[0]!.groups[0]!.links.forEach((item) => link(2, item))
      return
    }
    for (const category of categories) {
      const depth = bySpace ? 3 : 2
      const groups = () =>
        category.groups.forEach((group) =>
          folder(depth, groupName(group.title), () =>
            group.links.forEach((item) => link(depth + 1, item)),
          ),
        )
      if (bySpace) folder(2, category.name || options.groupName, groups)
      else groups()
    }
  })
  lines.push('</DL><p>')
  return `${lines.join('\n')}\n`
}
