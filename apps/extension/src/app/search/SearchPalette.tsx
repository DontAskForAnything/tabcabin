import { Bookmark, CircleCheck, Image as ImageIcon, Search, StickyNote } from 'lucide-react'
import { displayUrl, isSavableUrl } from '@tabhangar/core'
import { Button, cn, Favicon, Kbd, Modal, toast } from '@tabhangar/ui'
import { useLiveQuery } from 'dexie-react-hooks'
import { type ReactNode, useEffect, useMemo, useRef, useState } from 'react'
import { loadItemDocs, type SearchDoc } from '@/db/search'
import { type MessageKey, useT } from '@/i18n'
import { faviconUrl, hostSeed, openUrl } from '@/lib/browser'
import { useUi } from '@/state/ui'
import { useOpenTabs } from '../panel/useOpenTabs'
import { revealItem, type ActiveContext } from '../useActive'
import { hasBookmarkAccess, loadBookmarkDocs, requestBookmarkAccess } from './bookmarks'
import { highlightParts, recentDocs, search, type SearchHit } from './engine'

type Scope = 'workspace' | 'all' | 'tabs' | 'bookmarks'
const SCOPES: { value: Scope; label: MessageKey }[] = [
  { value: 'workspace', label: 'search.scopeWorkspace' },
  { value: 'all', label: 'search.scopeAll' },
  { value: 'tabs', label: 'search.scopeTabs' },
  { value: 'bookmarks', label: 'search.scopeBookmarks' },
]

const SECTION: Record<SearchDoc['kind'], MessageKey> = {
  link: 'search.sectionLinks',
  image: 'search.sectionLinks',
  note: 'search.sectionNotes',
  todo: 'search.sectionNotes',
  tab: 'search.sectionTabs',
  bookmark: 'search.sectionBookmarks',
}

export function SearchPalette({ open, active }: { open: boolean; active: ActiveContext }) {
  const t = useT()
  const close = useUi((s) => s.closeModal)
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<Scope>('workspace')
  const [index, setIndex] = useState(0)
  const [bookmarkAccess, setBookmarkAccess] = useState<boolean | null>(null)
  const [bookmarks, setBookmarks] = useState<SearchDoc[]>([])
  const listRef = useRef<HTMLDivElement>(null)
  const tabs = useOpenTabs()
  const workspaceId = active.workspace?.id

  useEffect(() => {
    if (!open) return
    setQuery('')
    setIndex(0)
  }, [open])

  const itemDocs = useLiveQuery(
    () =>
      open && (scope === 'workspace' || scope === 'all')
        ? loadItemDocs(scope === 'workspace' ? workspaceId : undefined)
        : Promise.resolve([]),
    [open, scope, workspaceId],
  )

  useEffect(() => {
    if (scope !== 'bookmarks' || !open) return
    void hasBookmarkAccess().then(async (granted) => {
      setBookmarkAccess(granted)
      if (granted) setBookmarks(await loadBookmarkDocs())
    })
  }, [scope, open])

  const docs: SearchDoc[] = useMemo(() => {
    if (scope === 'tabs') {
      const windowIds = [...new Set(tabs.map((tab) => tab.windowId))].sort((a, b) => a - b)
      return tabs
        .filter((tab) => isSavableUrl(tab.url))
        .map((tab) => ({
          key: `tab:${tab.id}`,
          kind: 'tab' as const,
          title: tab.title,
          url: tab.url,
          text: '',
          createdAt: 0,
          path: t('search.tabInWindow', {
            window: t('panel.windowN', { n: windowIds.indexOf(tab.windowId) + 1 }),
          }),
          tabId: tab.id,
          windowId: tab.windowId,
          favIconUrl: tab.favIconUrl,
        }))
    }
    if (scope === 'bookmarks') return bookmarks
    return itemDocs ?? []
  }, [scope, tabs, bookmarks, itemDocs, t])

  const hits: SearchHit[] = useMemo(() => {
    if (query.trim()) return search(docs, query)
    const base = scope === 'tabs' ? docs : recentDocs(docs)
    return base.map((doc) => ({ doc, titleRanges: [] }))
  }, [docs, query, scope])

  const sections = useMemo(() => {
    const order: MessageKey[] = []
    const byKey = new Map<MessageKey, SearchHit[]>()
    for (const hit of hits) {
      const key = query.trim()
        ? SECTION[hit.doc.kind]
        : scope === 'tabs'
          ? 'search.sectionTabs'
          : 'search.recentlyAdded'
      if (!byKey.has(key)) {
        byKey.set(key, [])
        order.push(key)
      }
      byKey.get(key)!.push(hit)
    }
    return order.map((key) => ({ key, hits: byKey.get(key)! }))
  }, [hits, query, scope])
  const flat = sections.flatMap((section) => section.hits)
  const selected = flat[Math.min(index, flat.length - 1)]

  useEffect(() => setIndex(0), [query, scope])
  useEffect(() => {
    listRef.current?.querySelector('[data-selected="true"]')?.scrollIntoView({ block: 'nearest' })
  }, [index])

  const goTo = async (doc: SearchDoc) => {
    if (!doc.itemId || !doc.workspaceId || !doc.categoryId || !active.settings) return
    close()
    await revealItem(active.settings, {
      workspaceId: doc.workspaceId,
      categoryId: doc.categoryId,
      itemId: doc.itemId,
    })
  }

  const run = async (doc: SearchDoc, reveal = false) => {
    if (reveal || doc.kind === 'note' || doc.kind === 'todo') return goTo(doc)
    if (doc.kind === 'tab' && doc.tabId !== undefined) {
      await browser.tabs.update(doc.tabId, { active: true })
      if (doc.windowId !== undefined) await browser.windows.update(doc.windowId, { focused: true })
      close()
      return
    }
    if (doc.url) {
      close()
      await openUrl(doc.url, {
        newTab: active.settings?.openLinksInNewTab ?? false,
        focusExisting: active.settings?.focusExistingTab ?? true,
      })
    }
  }

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
            void run(selected.doc, event.metaKey || event.ctrlKey)
          } else if (event.key === 'Tab') {
            event.preventDefault()
            const at = SCOPES.findIndex((s) => s.value === scope)
            setScope(SCOPES[(at + (event.shiftKey ? SCOPES.length - 1 : 1)) % SCOPES.length]!.value)
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
        <div className="flex flex-wrap gap-1.5 border-b border-line px-5 py-3">
          {SCOPES.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setScope(option.value)}
              className={cn(
                'h-[30px] rounded-[9px] px-3 text-[12.5px] font-medium transition-colors',
                scope === option.value
                  ? 'bg-accent font-semibold text-on-accent'
                  : 'bg-subtle text-ink-2 hover:text-ink',
              )}
            >
              {t(option.label)}
            </button>
          ))}
        </div>

        <div ref={listRef} className="min-h-[120px] flex-1 overflow-y-auto px-2.5 py-2">
          {scope === 'bookmarks' && bookmarkAccess === false ? (
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center">
              <Bookmark size={26} className="text-ink-3" />
              <p className="text-[14px] text-ink-2">{t('search.allowBookmarks')}</p>
              <Button
                variant="primary"
                size="sm"
                onClick={async () => {
                  const granted = await requestBookmarkAccess()
                  setBookmarkAccess(granted)
                  if (granted) setBookmarks(await loadBookmarkDocs())
                  else toast({ title: t('search.bookmarksDenied'), tone: 'info' })
                }}
              >
                {t('search.allow')}
              </Button>
            </div>
          ) : flat.length === 0 ? (
            query.trim() && (
              <p className="px-4 py-10 text-center text-[14px] text-ink-3">
                {t('search.noResults', { query })}
              </p>
            )
          ) : (
            sections.map((section) => (
              <div key={section.key} className="mb-1">
                <div className="px-2.5 pt-2.5 pb-1.5 text-[11.5px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
                  {t(section.key)}
                </div>
                {section.hits.map((hit) => {
                  const isSelected = hit === selected
                  return (
                    <ResultRow
                      key={hit.doc.key}
                      hit={hit}
                      selected={isSelected}
                      onHover={() => setIndex(flat.indexOf(hit))}
                      onClick={(reveal) => void run(hit.doc, reveal)}
                      action={
                        hit.doc.kind === 'tab'
                          ? t('search.actionSwitch')
                          : hit.doc.kind === 'note' || hit.doc.kind === 'todo'
                            ? t('search.actionGoTo')
                            : t('search.actionOpen')
                      }
                    />
                  )
                })}
              </div>
            ))
          )}
        </div>

        <div className="flex flex-wrap gap-4 border-t border-line bg-subtle/70 px-5 py-3 text-[12px] text-ink-3">
          <Hint keys={['↑', '↓']}>{t('search.hintSelect')}</Hint>
          <Hint keys={['↵']}>{t('search.hintOpen')}</Hint>
          <Hint keys={['Ctrl ↵']}>{t('search.hintGoTo')}</Hint>
          <Hint keys={['Tab']}>{t('search.hintScope')}</Hint>
        </div>
      </div>
    </Modal>
  )
}

function Hint({ keys, children }: { keys: string[]; children: ReactNode }) {
  return (
    <span className="flex items-center gap-1.5">
      {keys.map((key) => (
        <Kbd key={key} className="bg-card">
          {key}
        </Kbd>
      ))}
      {children}
    </span>
  )
}

function ResultRow({
  hit,
  selected,
  onHover,
  onClick,
  action,
}: {
  hit: SearchHit
  selected: boolean
  onHover: () => void
  onClick: (reveal: boolean) => void
  action: string
}) {
  const { doc } = hit
  const icon =
    doc.kind === 'note' || doc.kind === 'todo' ? (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-[var(--note-amber-bg)] text-[var(--note-amber-ink)]">
        {doc.kind === 'todo' ? <CircleCheck size={16} /> : <StickyNote size={16} />}
      </span>
    ) : doc.kind === 'image' ? (
      <span className="flex size-9 shrink-0 items-center justify-center rounded-[10px] bg-subtle-2 text-ink-2">
        <ImageIcon size={16} />
      </span>
    ) : (
      <Favicon
        src={faviconUrl(doc.url) ?? doc.favIconUrl}
        seed={hostSeed(doc.url, doc.title)}
        size="md"
      />
    )
  return (
    <button
      type="button"
      data-selected={selected}
      onMouseMove={onHover}
      onClick={(event) => onClick(event.metaKey || event.ctrlKey)}
      className={cn(
        'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left',
        selected && 'bg-accent-soft',
      )}
    >
      {icon}
      <span className="min-w-0 flex-1">
        <span
          className={cn(
            'block truncate text-[14.5px] font-[550]',
            doc.done && 'text-ink-3 line-through',
          )}
        >
          {highlightParts(doc.title || doc.url || '', hit.titleRanges).map((part, i) =>
            part.hit ? (
              <mark key={i} className="rounded-[3px] bg-accent-soft px-px text-inherit">
                {part.text}
              </mark>
            ) : (
              <span key={i}>{part.text}</span>
            ),
          )}
        </span>
        <span className="block truncate text-[12.5px] text-ink-3">
          {doc.path}
          {doc.url && doc.kind !== 'tab' ? ` · ${displayUrl(doc.url)}` : ''}
        </span>
      </span>
      {selected && (
        <span className="flex shrink-0 items-center gap-1.5 text-[12px] font-semibold text-accent-ink">
          {action}
          <Kbd className="bg-card">↵</Kbd>
        </span>
      )}
    </button>
  )
}
