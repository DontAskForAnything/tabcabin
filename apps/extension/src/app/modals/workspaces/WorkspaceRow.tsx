import {
  cn,
  EmojiPickerPopover,
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuTrigger,
  toast,
} from '@tabcabin/ui'
import { ArrowDown, ArrowUp, Ellipsis, Pencil, Trash } from 'lucide-react'
import type { WorkspaceOverview } from '@/db/overview'
import { deleteWorkspace, reorderWorkspace, updateWorkspace } from '@/db/repo'
import { useT } from '@/i18n'
import { emojiBaseUrl } from '@/lib/browser'
import { confirmDialog } from '@/state/confirm'
import { offerUndo } from '@/state/undo'
import { InlineRename } from '../../shared/InlineRename'
import type { Cell } from './cell'

export function WorkspaceRow({
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
          <InlineRename
            initial={ws.name}
            label={t('workspace.rename')}
            className="rounded-lg px-2 text-[16px]"
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
