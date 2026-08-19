import type { SearchDoc } from '@/db/search'

export async function hasBookmarkAccess(): Promise<boolean> {
  if (typeof browser === 'undefined' || !browser.permissions) return false
  return browser.permissions.contains({ permissions: ['bookmarks'] })
}

export async function requestBookmarkAccess(): Promise<boolean> {
  return browser.permissions.request({ permissions: ['bookmarks'] })
}

/** Flattens the bookmark tree into search documents. */
export async function loadBookmarkDocs(): Promise<SearchDoc[]> {
  if (!browser.bookmarks) return []
  const tree = await browser.bookmarks.getTree()
  const docs: SearchDoc[] = []
  const walk = (nodes: Browser.bookmarks.BookmarkTreeNode[], folder: string) => {
    for (const node of nodes) {
      if (node.url)
        docs.push({
          key: `bookmark:${node.id}`,
          kind: 'bookmark',
          title: node.title || node.url,
          url: node.url,
          text: '',
          createdAt: node.dateAdded ?? 0,
          path: folder,
        })
      if (node.children) walk(node.children, node.title ? node.title : folder)
    }
  }
  walk(tree, '')
  return docs
}
