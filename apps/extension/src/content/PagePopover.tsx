import { Check, ChevronDown, GripVertical, ListTodo, Plus, X } from 'lucide-react'
import { displayHost, NOTE_COLORS, type NoteColor } from '@tabhangar/core'
import { cn, letterTileFor } from '@tabhangar/ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { PopoverData } from '@/background/popover'
import type { MessageKey } from '@/i18n/en'
import { translate } from '@/i18n/translate'
import type { PopoverSaveRequest } from '@/messages'

type Target = { groupId: string } | { newGroupIn: string; title: string }

export interface PageInfo {
  url: string
  title: string
  favIconUrl: string | null
}

export function PagePopover({ page, onClose }: { page: PageInfo; onClose: () => void }) {
  const [data, setData] = useState<PopoverData | null>(null)
  const [note, setNote] = useState('')
  const [color, setColor] = useState<NoteColor | null>(null)
  const [todo, setTodo] = useState(false)
  const [closeTab, setCloseTab] = useState(false)
  const [target, setTarget] = useState<Target | null>(null)
  const [picking, setPicking] = useState(false)
  const [workspaceId, setWorkspaceId] = useState<string | null>(null)
  const [status, setStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [savedTo, setSavedTo] = useState('')
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null)
  const textarea = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    void browser.runtime
      .sendMessage({ type: 'tabhangar:popover-data', url: page.url })
      .then((response: PopoverData) => {
        setData(response)
        setWorkspaceId(response.activeWorkspaceId)
        const ws =
          response.workspaces.find((w) => w.id === response.activeWorkspaceId) ??
          response.workspaces[0]
        const category =
          ws?.categories.find((c) => c.id === response.activeCategoryId) ?? ws?.categories[0]
        const group = category?.groups[0]
        if (group) setTarget({ groupId: group.id })
        else if (category) setTarget({ newGroupIn: category.id, title: displayHost(page.url) })
      })
    textarea.current?.focus()
  }, [page.url])

  const t = (key: MessageKey, params?: Record<string, string | number>) =>
    translate(data?.locale ?? 'en', key, params)
  const dark =
    data?.theme === 'dark' ||
    (data?.theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)

  const workspace = data?.workspaces.find((ws) => ws.id === workspaceId) ?? data?.workspaces[0]
  const targetLabel = useMemo(() => {
    if (!data || !target) return '…'
    for (const ws of data.workspaces)
      for (const cat of ws.categories) {
        if ('newGroupIn' in target && target.newGroupIn === cat.id)
          return `${ws.emoji} ${cat.name} › ${t('menu.newGroup')}`
        const group = cat.groups.find((g) => 'groupId' in target && g.id === target.groupId)
        if (group)
          return `${ws.emoji} ${cat.name} › ${group.emoji} ${group.title || t('group.untitled')}`
      }
    return '…'
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, target])

  const save = async () => {
    if (!target || status === 'saving') return
    setStatus('saving')
    const request: PopoverSaveRequest = {
      type: 'tabhangar:popover-save',
      page,
      target,
      note: note.trim() ? { text: note, color, todo } : null,
      closeTab,
    }
    const response = (await browser.runtime.sendMessage(request)) as {
      ok: boolean
      groupTitle?: string
    }
    if (!response?.ok) {
      setStatus('error')
      return
    }
    setSavedTo(response.groupTitle ?? '')
    setStatus('saved')
    setTimeout(onClose, 1400)
  }

  const tile = letterTileFor(displayHost(page.url) || page.title)

  return (
    <div className={cn('font-sans', dark && 'dark')}>
      <div
        role="dialog"
        aria-label="TabHangar"
        onKeyDown={(event) => {
          if (event.key === 'Escape') onClose()
          if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) void save()
        }}
        style={{ transform: `translate(${offset.x}px, ${offset.y}px)` }}
        className="pointer-events-auto fixed top-6 right-6 w-[372px] overflow-hidden rounded-[20px] bg-card text-[14px] text-ink shadow-pop"
      >
        <div
          className="flex cursor-grab items-center justify-between px-3 pt-2.5 active:cursor-grabbing"
          onPointerDown={(event) => {
            if ((event.target as HTMLElement).closest('button')) return
            event.currentTarget.setPointerCapture(event.pointerId)
            drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y }
          }}
          onPointerMove={(event) => {
            if (!drag.current) return
            setOffset({
              x: drag.current.ox + event.clientX - drag.current.x,
              y: drag.current.oy + event.clientY - drag.current.y,
            })
          }}
          onPointerUp={() => (drag.current = null)}
        >
          <GripVertical size={17} className="text-ink-4" />
          <button
            type="button"
            aria-label={t('common.close')}
            onClick={onClose}
            className="flex size-[30px] items-center justify-center rounded-[9px] text-ink-3 hover:bg-subtle"
          >
            <X size={15} />
          </button>
        </div>

        <div className="flex flex-col gap-3.5 px-[18px] pt-1 pb-[18px]">
          <div className="flex items-center gap-3">
            {page.favIconUrl ? (
              <span className="flex size-10 items-center justify-center rounded-[11px] bg-white shadow-tile">
                <img src={page.favIconUrl} alt="" className="size-[22px]" />
              </span>
            ) : (
              <span
                className="flex size-10 items-center justify-center rounded-[11px] font-bold shadow-tile"
                style={{ background: tile.bg, color: tile.fg }}
              >
                {tile.letter}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-semibold">
                {page.title || displayHost(page.url)}
              </div>
              <div className="truncate text-[12.5px] text-ink-3">{displayHost(page.url)}</div>
            </div>
          </div>

          {data && data.savedIn.length > 0 && status === 'idle' && (
            <div className="rounded-[10px] bg-success-soft px-2.5 py-2 text-[12.5px] font-medium text-success">
              <div className="flex items-center gap-2">
                <Check size={14} strokeWidth={2.6} />
                {data.savedIn.length === 1
                  ? data.savedIn[0]!.path
                  : `${data.savedIn.length}× · ${data.savedIn[0]!.path}`}
              </div>
              {data.savedIn
                .filter((entry) => entry.text)
                .slice(0, 2)
                .map((entry) => (
                  <div
                    key={entry.itemId}
                    className="mt-1.5 rounded-lg px-2 py-1.5 text-[12.5px] whitespace-pre-line"
                    style={{
                      background: `var(--note-${entry.color ?? 'sky'}-bg)`,
                      color: `var(--note-${entry.color ?? 'sky'}-ink)`,
                    }}
                  >
                    {entry.text}
                  </div>
                ))}
            </div>
          )}

          {status === 'saved' ? (
            <div className="flex flex-col items-center gap-2 py-6 text-center">
              <span className="flex size-11 items-center justify-center rounded-2xl bg-success text-white">
                <Check size={22} strokeWidth={2.8} />
              </span>
              <span className="text-[15px] font-semibold">
                {t('toast.saved', { group: savedTo })}
              </span>
            </div>
          ) : (
            <>
              <label className="block">
                <span className="mb-1.5 block text-[12px] font-semibold text-ink-3">
                  {t('editor.comment')}
                </span>
                <textarea
                  ref={textarea}
                  rows={3}
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={t('editor.commentPlaceholder')}
                  style={
                    color
                      ? { background: `var(--note-${color}-bg)`, color: `var(--note-${color}-ink)` }
                      : undefined
                  }
                  className="w-full resize-none rounded-xl bg-subtle px-3 py-2.5 text-[14px] leading-[1.45] text-ink outline-none placeholder:text-ink-3 focus:shadow-[0_0_0_2px_var(--focus)]"
                />
              </label>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  aria-label={t('note.noColor')}
                  onClick={() => setColor(null)}
                  className={cn(
                    'size-[22px] rounded-[7px] bg-subtle shadow-[inset_0_0_0_1px_rgb(20_24_40/0.1)]',
                    !color && 'shadow-[0_0_0_2px_var(--card),0_0_0_4px_var(--accent)]',
                  )}
                />
                {NOTE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={c}
                    onClick={() => setColor(c)}
                    style={{ background: `var(--note-${c}-bg)` }}
                    className={cn(
                      'size-[22px] rounded-[7px]',
                      color === c && 'shadow-[0_0_0_2px_var(--card),0_0_0_4px_var(--accent)]',
                    )}
                  />
                ))}
                <div className="flex-1" />
                <button
                  type="button"
                  aria-pressed={todo}
                  onClick={() => setTodo((value) => !value)}
                  className={cn(
                    'flex h-7 items-center gap-1.5 rounded-lg px-2.5 text-[12.5px] font-semibold',
                    todo ? 'bg-accent-soft text-accent-ink' : 'bg-subtle text-ink-2',
                  )}
                >
                  <ListTodo size={13} />
                  {t('note.todo')}
                </button>
              </div>

              <div className="flex flex-col gap-1.5">
                <span className="text-[12px] font-semibold text-ink-3">{t('tab.saveTo')}</span>
                <button
                  type="button"
                  aria-expanded={picking}
                  onClick={() => setPicking((value) => !value)}
                  className="flex h-10 items-center gap-2 rounded-[11px] bg-subtle px-3 text-left text-[13.5px] font-medium"
                >
                  <span className="min-w-0 flex-1 truncate">{targetLabel}</span>
                  <ChevronDown
                    size={14}
                    className={cn('text-ink-3 transition-transform', picking && 'rotate-180')}
                  />
                </button>
                {picking && data && (
                  <div className="max-h-[220px] overflow-y-auto rounded-xl border border-line p-1.5">
                    {data.workspaces.length > 1 && (
                      <div className="mb-1.5 flex flex-wrap gap-1">
                        {data.workspaces.map((ws) => (
                          <button
                            key={ws.id}
                            type="button"
                            onClick={() => setWorkspaceId(ws.id)}
                            className={cn(
                              'h-7 rounded-lg px-2 text-[12px] font-semibold',
                              ws.id === workspace?.id
                                ? 'bg-accent text-white'
                                : 'bg-subtle text-ink-2',
                            )}
                          >
                            {ws.emoji} {ws.name}
                          </button>
                        ))}
                      </div>
                    )}
                    {workspace?.categories.map((cat) => (
                      <div key={cat.id}>
                        <div className="px-2 pt-1.5 pb-1 text-[11px] font-semibold tracking-[0.05em] text-ink-3 uppercase">
                          {cat.name}
                        </div>
                        {cat.groups.map((group) => (
                          <button
                            key={group.id}
                            type="button"
                            onClick={() => {
                              setTarget({ groupId: group.id })
                              setPicking(false)
                            }}
                            className={cn(
                              'flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] hover:bg-subtle',
                              target &&
                                'groupId' in target &&
                                target.groupId === group.id &&
                                'bg-accent-soft font-semibold text-accent-ink',
                            )}
                          >
                            <span>{group.emoji}</span>
                            <span className="truncate">{group.title || t('group.untitled')}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => {
                            setTarget({
                              newGroupIn: cat.id,
                              title: displayHost(page.url) || page.title,
                            })
                            setPicking(false)
                          }}
                          className="flex h-8 w-full items-center gap-2 rounded-lg px-2 text-left text-[13px] text-ink-3 hover:bg-subtle"
                        >
                          <Plus size={13} />
                          {t('tab.saveToNew')}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-ink-2">
                <input
                  type="checkbox"
                  checked={closeTab}
                  onChange={(event) => setCloseTab(event.target.checked)}
                  className="size-4 accent-[var(--accent)]"
                />
                {t('popover.closeAfterSave')}
              </label>

              {status === 'error' && (
                <p className="text-[12.5px] font-medium text-danger">{t('toast.failed')}</p>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void browser.runtime.sendMessage({ type: 'tabhangar:open-app' })}
                  className="h-[42px] flex-1 rounded-xl bg-subtle text-[13.5px] font-semibold text-ink"
                >
                  {t('menu.openApp')}
                </button>
                <button
                  type="button"
                  disabled={!target || status === 'saving'}
                  onClick={() => void save()}
                  className="h-[42px] flex-1 rounded-xl bg-accent text-[13.5px] font-semibold text-white shadow-glow disabled:opacity-60"
                >
                  {t('common.save')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
