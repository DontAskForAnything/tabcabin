import { toast } from '@tabcabin/ui'
import { useLiveQuery } from 'dexie-react-hooks'
import { useEffect, useMemo, useState } from 'react'
import { loadGroupDocs, loadItemDocs, type SearchDoc } from '@/db/search'
import { useT } from '@/i18n'
import { useOpenTabs } from '../panel/useOpenTabs'
import { hasBookmarkAccess, loadBookmarkDocs, requestBookmarkAccess } from './bookmarks'
import type { Scope } from './scopes'
import { tabDocs } from './tabDocs'

/** Everything the palette can search in the chosen scope (bookmarks need a permission first). */
export function useSearchDocs(open: boolean, scope: Scope, workspaceId: string | undefined) {
  const t = useT()
  const tabs = useOpenTabs()
  const [bookmarkAccess, setBookmarkAccess] = useState<boolean | null>(null)
  const [bookmarks, setBookmarks] = useState<SearchDoc[]>([])

  const itemDocs = useLiveQuery(async () => {
    if (!open || (scope !== 'workspace' && scope !== 'all')) return []
    const id = scope === 'workspace' ? workspaceId : undefined
    const [groups, items] = await Promise.all([loadGroupDocs(id), loadItemDocs(id)])
    return [...groups, ...items]
  }, [open, scope, workspaceId])

  useEffect(() => {
    if (scope !== 'bookmarks' || !open) return
    void hasBookmarkAccess().then(async (granted) => {
      setBookmarkAccess(granted)
      if (granted) setBookmarks(await loadBookmarkDocs())
    })
  }, [scope, open])

  const docs = useMemo(() => {
    if (scope === 'tabs') return tabDocs(tabs ?? [], t)
    if (scope === 'bookmarks') return bookmarks
    return itemDocs ?? []
  }, [scope, tabs, bookmarks, itemDocs, t])

  return {
    docs,
    needsBookmarkAccess: scope === 'bookmarks' && bookmarkAccess === false,
    async allowBookmarks() {
      const granted = await requestBookmarkAccess()
      setBookmarkAccess(granted)
      if (granted) setBookmarks(await loadBookmarkDocs())
      else toast({ title: t('search.bookmarksDenied'), tone: 'info' })
    },
  }
}
