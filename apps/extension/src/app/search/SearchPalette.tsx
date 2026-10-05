import { Kbd, Modal } from '@tabcabin/ui'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'
import type { ActiveContext } from '../useActive'
import { BookmarkAccess } from './BookmarkAccess'
import { recentDocs, search, type SearchHit } from './engine'
import { ResultSections } from './ResultSections'
import { nextScope, type Scope } from './scopes'
import { ScopeTabs } from './ScopeTabs'
import { SearchHints } from './SearchHints'
import { groupHits } from './sections'
import { useOpenResult } from './useOpenResult'
import { useSearchDocs } from './useSearchDocs'

/** Ctrl+K: searches links, notes, open tabs and bookmarks, fully by keyboard. */
export function SearchPalette({ open, active }: { open: boolean; active: ActiveContext }) {
  const t = useT()
  const close = useUi((s) => s.closeModal)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope>('workspace')
  const [index, setIndex] = useState(0)
  const listRef = useRef<HTMLDivElement>(null)
  const { docs, needsBookmarkAccess, allowBookmarks } = useSearchDocs(
    open,
    scope,
    active.workspace?.id,
  )
  const openResult = useOpenResult(active)

  useEffect(() => {
    if (!open) return
    setQuery('')
    setIndex(0)
  }, [open])

  const hits: SearchHit[] = useMemo(() => {
    if (query.trim()) return search(docs, query)
    const base = scope === 'tabs' ? docs : recentDocs(docs)
    return base.map((doc) => ({ doc, titleRanges: [] }))
  }, [docs, query, scope])
  const sections = useMemo(() => groupHits(hits, !!query.trim(), scope), [hits, query, scope])
  const flat = sections.flatMap((section) => section.hits)
  const selected = flat[Math.min(index, flat.length - 1)]

  useEffect(() => setIndex(0), [query, scope])
  useEffect(() => {
    listRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [index])

  return (
    <Modal
      open={open}
      onOpenChange={(value) => !value && close()}
      title={t('search.button')}
      hideTitle
      size="lg"
      placement="top"
    >
      <div
        className="flex max-h-[76vh] flex-col"
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            const delta = event.key === 'ArrowDown' ? 1 : -1
            setIndex((value) => (flat.length ? (value + delta + flat.length) % flat.length : 0))
          } else if (event.key === 'Enter' && selected) {
            event.preventDefault()
            void openResult(selected.doc, event.metaKey || event.ctrlKey)
          } else if (event.key === 'Tab') {
            event.preventDefault()
            setScope(nextScope(scope, event.shiftKey))
          }
        }}
      >
        <label className="flex items-center gap-3 border-b border-line px-5 py-4">
          <Search size={20} className="shrink-0 text-accent" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('search.placeholder')}
            aria-label={t('search.placeholder')}
            className="min-w-0 flex-1 bg-transparent text-[17px] text-ink outline-none placeholder:text-ink-3"
          />
          <Kbd>Esc</Kbd>
        </label>
        <ScopeTabs scope={scope} onChange={setScope} />

        <div ref={listRef} className="min-h-[120px] flex-1 overflow-y-auto px-2.5 py-2">
          {needsBookmarkAccess ? (
            <BookmarkAccess onAllow={() => void allowBookmarks()} />
          ) : flat.length === 0 ? (
            query.trim() && (
              <p className="px-4 py-10 text-center text-[14px] text-ink-3">
                {t('search.noResults', { query })}
              </p>
            )
          ) : (
            <ResultSections
              sections={sections}
              selected={selected}
              onHover={(hit) => setIndex(flat.indexOf(hit))}
              onOpen={(hit, reveal) => void openResult(hit.doc, reveal)}
            />
          )}
        </div>

        <SearchHints />
      </div>
    </Modal>
  )
}
