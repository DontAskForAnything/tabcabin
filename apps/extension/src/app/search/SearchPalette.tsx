import { Kbd, Modal } from '@tabcabin/ui'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { SearchDoc } from '@/db/search'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'
import { useBoardActions } from '../board/actions'
import type { ActiveContext } from '../useActive'
import { BookmarkAccess } from './BookmarkAccess'
import { GroupPicker } from './GroupPicker'
import { addTo, canMove, moveTo } from './moveTo'
import { recentDocs, search, type SearchHit } from './engine'
import { ResultSections } from './ResultSections'
import { nextScope, type Scope } from './scopes'
import { ScopeTabs } from './ScopeTabs'
import { SearchHints } from './SearchHints'
import { groupHits } from './sections'
import { useOpenResult } from './useOpenResult'
import { type GroupTarget, useGroupTargets } from './useGroupTargets'
import { useSearchDocs } from './useSearchDocs'

/** What the second step of an action does with the group it picks. */
type Task = { type: 'move'; doc: SearchDoc } | { type: 'add'; text: string }

/**
 * Ctrl+K: searches links, notes, groups, open tabs and bookmarks, fully by keyboard. It also acts:
 * Enter on a group opens it, → moves a tab or an item to a group, and what was typed can be added
 * to a group as a note or a link.
 */
export function SearchPalette({ open, active }: { open: boolean; active: ActiveContext }) {
  const t = useT()
  const close = useUi((s) => s.closeModal)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope>('workspace')
  const [index, setIndex] = useState(0)
  const [task, setTask] = useState<Task | null>(null)
  const listRef = useRef<HTMLDivElement>(null)
  const actions = useBoardActions(active)
  const targets = useGroupTargets(active.workspace?.id, task !== null)
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
    setTask(null)
  }, [open])

  const hits: SearchHit[] = useMemo(() => {
    if (query.trim()) return search(docs, query)
    const base = scope === 'tabs' ? docs : recentDocs(docs)
    return base.map((doc) => ({ doc, titleRanges: [] }))
  }, [docs, query, scope])
  const typed = query.trim()
  const sections = useMemo(() => {
    const found = groupHits(hits, !!typed, scope)
    if (!typed || scope === 'tabs' || scope === 'bookmarks') return found
    const add: SearchHit = {
      doc: {
        key: 'command:add',
        kind: 'command',
        title: t('search.add', { text: typed }),
        url: null,
        text: '',
        createdAt: 0,
        path: t('search.addPath'),
      },
      titleRanges: [],
    }
    return [...found, { key: 'search.sectionActions' as const, hits: [add] }]
  }, [hits, typed, scope, t])
  const flat = sections.flatMap((section) => section.hits)
  const selected = flat[Math.min(index, flat.length - 1)]

  useEffect(() => setIndex(0), [query, scope])

  const run = (hit: SearchHit, reveal: boolean) => {
    if (hit.doc.kind === 'command') setTask({ type: 'add', text: typed })
    else void openResult(hit.doc, reveal)
  }
  const pick = async (target: GroupTarget) => {
    if (!task) return
    close()
    if (task.type === 'move') await moveTo(task.doc, target, t)
    else await addTo(task.text, target, actions, t)
  }
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
      onEscapeKeyDown={(event) => {
        // Escape in the second step goes back to the results.
        if (!task) return
        event.preventDefault()
        setTask(null)
      }}
    >
      {task ? (
        <GroupPicker
          heading={
            task.type === 'move'
              ? t('search.moveHeading', { title: task.doc.title || task.doc.url || '' })
              : t('search.addHeading', { text: task.text })
          }
          targets={targets}
          onPick={(target) => void pick(target)}
          onBack={() => setTask(null)}
        />
      ) : (
        <div
          className="flex max-h-[76vh] flex-col"
          onKeyDown={(event) => {
            const field = event.target
            const atEnd =
              !(field instanceof HTMLInputElement) || field.selectionStart === field.value.length
            if (event.key === 'ArrowRight' && atEnd && selected && canMove(selected.doc)) {
              event.preventDefault()
              setTask({ type: 'move', doc: selected.doc })
            } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
              event.preventDefault()
              const delta = event.key === 'ArrowDown' ? 1 : -1
              setIndex((value) => (flat.length ? (value + delta + flat.length) % flat.length : 0))
            } else if (event.key === 'Enter' && selected) {
              event.preventDefault()
              run(selected, event.metaKey || event.ctrlKey)
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
            {typed && hits.length === 0 && !needsBookmarkAccess && (
              <p className="px-4 pt-8 pb-6 text-center text-[14px] text-ink-3">
                {t('search.noResults', { query })}
              </p>
            )}
            {needsBookmarkAccess ? (
              <BookmarkAccess onAllow={() => void allowBookmarks()} />
            ) : flat.length === 0 ? null : (
              <ResultSections
                sections={sections}
                selected={selected}
                onHover={(hit) => setIndex(flat.indexOf(hit))}
                onOpen={run}
                onMove={(hit) => setTask({ type: 'move', doc: hit.doc })}
              />
            )}
          </div>

          <SearchHints />
        </div>
      )}
    </Modal>
  )
}
