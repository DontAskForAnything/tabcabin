import { isSavableUrl, TITLE_MAX_LENGTH } from '@tabhangar/core'
import { addLinks, createGroup, type Result } from '@/db/repo'

/* Links that come from the browser itself: bookmark folders and the most visited sites. */

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
