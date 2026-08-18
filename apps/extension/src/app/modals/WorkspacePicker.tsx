import { ArrowDown, ArrowUp, Ellipsis, Pencil, Plus, Search, Trash } from 'lucide-react'
import {
  Button,
  cn,
  EmojiPickerPopover,
  IconButton,
  Input,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  Modal,
  toast,
} from '@tabhangar/ui'
import { useEffect, useMemo, useRef, useState } from 'react'
import { useOverview, type WorkspaceOverview } from '@/db/overview'
import { createWorkspace, deleteWorkspace, reorderWorkspace, updateWorkspace } from '@/db/repo'
import { useT } from '@/i18n'
import { emojiBaseUrl } from '@/lib/browser'
import { confirmDialog } from '@/state/confirm'
import { useUi } from '@/state/ui'
import { offerUndo } from '@/state/undo'
import { setActiveCategory, type ActiveContext } from '../useActive'

interface Cell {
  workspaceId: string
  categoryId: string
}

export function WorkspacePicker({ open, active }: { open: boolean; active: ActiveContext }) {
  const t = useT()
  const close = useUi((s) => s.closeModal)
  const overview = useOverview()
  const [query, setQuery] = useState('')
  const [highlight, setHighlight] = useState<Cell | null>(null)
  const [renaming, setRenaming] = useState<string | null>(null)

  const workspaceId = active.workspace?.id
  const categoryId = active.category?.id
  useEffect(() => {
    if (!open) return
    setQuery('')
    setRenaming(null)
    if (workspaceId && categoryId) setHighlight({ workspaceId, categoryId })
  }, [open, workspaceId, categoryId])

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!overview) return []
    if (!q) return overview
    return overview
      .map((ws) =>
        ws.name.toLowerCase().includes(q)
          ? ws
          : {
              ...ws,
              categories: ws.categories.filter((cat) => cat.name.toLowerCase().includes(q)),
            },
      )
      .filter((ws) => ws.categories.length > 0)
  }, [overview, query])

  const go = async (cell: Cell) => {
    if (!active.settings) return
    await setActiveCategory(active.settings, cell.workspaceId, cell.categoryId)
    close()
  }

  const move = (direction: 'up' | 'down' | 'left' | 'right') => {
    if (visible.length === 0) return
    const wsIndex = Math.max(
      0,
      visible.findIndex((ws) => ws.id === highlight?.workspaceId),
    )
    const ws = visible[wsIndex]!
    const catIndex = Math.max(
      0,
      ws.categories.findIndex((cat) => cat.id === highlight?.categoryId),
    )
    let nextWs = wsIndex
    let nextCat = catIndex
    if (direction === 'left') nextCat = catIndex - 1
    if (direction === 'right') nextCat = catIndex + 1
    if (direction === 'up') nextWs = wsIndex - 1
    if (direction === 'down') nextWs = wsIndex + 1
    if (nextCat < 0) {
      nextWs = wsIndex - 1
      nextCat = Infinity
    }
    if (nextCat >= ws.categories.length && direction === 'right') {
      nextWs = wsIndex + 1
      nextCat = 0
    }
    nextWs = (nextWs + visible.length) % visible.length
    const target = visible[nextWs]!
    const cat = target.categories[Math.min(nextCat, target.categories.length - 1)]
    if (cat) setHighlight({ workspaceId: target.id, categoryId: cat.id })
  }

  const create = async () => {
    const result = await createWorkspace({
      name: t('workspace.defaultName', { n: (overview?.length ?? 0) + 1 }),
      categoryName: t('category.defaultName'),
    })
    setHighlight({ workspaceId: result.workspaceId, categoryId: result.categoryId })
    setRenaming(result.workspaceId)
  }

  return (
    <Modal
      open={open}
      onOpenChange={(value) => !value && close()}
      title={t('workspace.pickerTitle')}
      hideTitle
      size="lg"
      placement="top"
    >
      <div
        className="flex max-h-[78vh] flex-col"
        onKeyDown={(event) => {
          if (renaming) return
          const keys: Record<string, 'up' | 'down' | 'left' | 'right'> = {
            ArrowUp: 'up',
            ArrowDown: 'down',
            ArrowLeft: 'left',
            ArrowRight: 'right',
          }
          const dir = keys[event.key]
          const editingText = event.target instanceof HTMLInputElement && query.length > 0
          if (dir && !(editingText && (dir === 'left' || dir === 'right'))) {
            event.preventDefault()
            move(dir)
          } else if (event.key === 'Enter' && highlight) {
            event.preventDefault()
            void go(highlight)
          }
        }}
      >
        <div className="border-b border-line p-4">
          <Input
            autoFocus
            leading={<Search size={17} className="text-accent" />}
            placeholder={t('workspace.search')}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="h-11 bg-subtle"
            inputClassName="text-[15px]"
          />
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          {visible.map((ws, index) => (
            <WorkspaceRow
              key={ws.id}
              ws={ws}
              index={index}
              total={visible.length}
              current={ws.id === active.workspace?.id}
              highlight={highlight}
              renaming={renaming === ws.id}
              onRename={() => setRenaming(ws.id)}
              onRenamed={() => setRenaming(null)}
              onPick={(cell) => void go(cell)}
              onHover={setHighlight}
              canDelete={(overview?.length ?? 0) > 1}
            />
          ))}
          {visible.length === 0 && (
            <p className="px-4 py-10 text-center text-[14px] text-ink-3">
              {t('workspace.noMatch', { query })}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3 border-t border-line bg-subtle/60 px-5 py-3">
          <span className="flex-1 text-[12.5px] text-ink-3">{t('workspace.hint')}</span>
          <Button
            variant="primary"
            size="sm"
            icon={<Plus size={14} />}
            onClick={() => void create()}
          >
            {t('workspace.new')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}

function WorkspaceRow({
  ws,
  index,
  total,
  current,
  highlight,
  renaming,
  onRename,
  onRenamed,
  onPick,
  onHover,
  canDelete,
}: {
  ws: WorkspaceOverview
  index: number
  total: number
  current: boolean
  highlight: Cell | null
  renaming: boolean
  onRename: () => void
  onRenamed: () => void
  onPick: (cell: Cell) => void
  onHover: (cell: Cell) => void
  canDelete: boolean
}) {
  const t = useT()
  const highlightedRow = highlight?.workspaceId === ws.id

  const remove = async () => {
    if (!canDelete) return toast({ title: t('workspace.lastOne'), tone: 'info' })
    const ok = await confirmDialog({
      title: t('workspace.delete'),
      description: t('workspace.deleteConfirm', { name: ws.name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      danger: true,
    })
    if (ok)
      offerUndo(await deleteWorkspace(ws.id), {
        title: t('workspace.deleted'),
        undoLabel: t('common.undo'),
      })
  }

  return (
    <section
      aria-label={ws.name}
      className={cn('rounded-2xl px-3 py-3 transition-colors', highlightedRow && 'bg-subtle')}
    >
      <div className="mb-2.5 flex items-center gap-2.5">
        <EmojiPickerPopover
          onSelect={(emoji) => void updateWorkspace(ws.id, { emoji })}
          emojibaseUrl={emojiBaseUrl()}
        >
          <button
            type="button"
            aria-label={t('workspace.changeEmoji')}
            className="rounded-lg text-[22px] leading-none transition-transform hover:scale-110"
          >
            {ws.emoji}
          </button>
        </EmojiPickerPopover>
        {renaming ? (
          <RenameField
            initial={ws.name}
            onDone={(name) => {
              onRenamed()
              if (name && name !== ws.name) void updateWorkspace(ws.id, { name })
            }}
          />
        ) : (
          <h3
            className={cn('text-[16px] font-semibold tracking-[-0.01em]', !current && 'text-ink-2')}
            onDoubleClick={onRename}
          >
            {ws.name}
          </h3>
        )}
        {current && (
          <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold text-accent-ink">
            {t('workspace.current')}
          </span>
        )}
        <div className="flex-1" />
        <Menu>
          <MenuTrigger asChild>
            <IconButton
              label={t('common.more')}
              icon={<Ellipsis size={16} />}
              size="sm"
              tooltip={false}
            />
          </MenuTrigger>
          <MenuContent align="end">
            <MenuItem icon={<Pencil size={14} />} onSelect={onRename}>
              {t('workspace.rename')}
            </MenuItem>
            <MenuItem
              icon={<ArrowUp size={14} />}
              disabled={index === 0}
              onSelect={() => void reorderWorkspace(ws.id, index - 1)}
            >
              {t('workspace.moveUp')}
            </MenuItem>
            <MenuItem
              icon={<ArrowDown size={14} />}
              disabled={index === total - 1}
              onSelect={() => void reorderWorkspace(ws.id, index + 1)}
            >
              {t('workspace.moveDown')}
            </MenuItem>
            <MenuSeparator />
            <MenuItem icon={<Trash size={14} />} danger onSelect={() => void remove()}>
              {t('workspace.delete')}
            </MenuItem>
          </MenuContent>
        </Menu>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-2.5">
        {ws.categories.map((cat) => {
          const on = highlight?.workspaceId === ws.id && highlight.categoryId === cat.id
          return (
            <button
              key={cat.id}
              type="button"
              onMouseEnter={() => onHover({ workspaceId: ws.id, categoryId: cat.id })}
              onClick={() => onPick({ workspaceId: ws.id, categoryId: cat.id })}
              className={cn(
                'flex flex-col overflow-hidden rounded-[13px] border-2 text-left transition-[border-color,box-shadow,transform] duration-150',
                on ? 'border-accent shadow-glow' : 'border-transparent',
              )}
            >
              <span
                className={cn(
                  'truncate px-3 py-2 text-[13px] font-semibold',
                  on ? 'bg-accent text-on-accent' : 'bg-subtle-2 text-ink-2',
                )}
              >
                {cat.name || t('category.defaultName')}
              </span>
              <span className="flex h-12 items-center gap-1.5 bg-subtle px-3">
                {cat.groupCount === 0 ? (
                  <span className="text-[11px] font-semibold tracking-[0.06em] text-ink-3 uppercase">
                    {t('workspace.emptyCategory')}
                  </span>
                ) : (
                  Array.from({ length: Math.min(cat.groupCount, 6) }, (_, i) => (
                    <span key={i} className="h-7 w-5 rounded-[5px] bg-card shadow-tile" />
                  ))
                )}
              </span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

function RenameField({ initial, onDone }: { initial: string; onDone: (value: string) => void }) {
  const t = useT()
  const [value, setValue] = useState(initial)
  const ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])
  return (
    <input
      ref={ref}
      value={value}
      aria-label={t('workspace.rename')}
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => onDone(value.trim())}
      onKeyDown={(event) => {
        event.stopPropagation()
        if (event.key === 'Enter') onDone(value.trim())
        if (event.key === 'Escape') onDone(initial)
      }}
      className="h-8 rounded-lg bg-card px-2 text-[16px] font-semibold shadow-tile outline-none"
    />
  )
}
