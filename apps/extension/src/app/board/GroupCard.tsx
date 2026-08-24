import {
  AppWindow,
  ArrowDownAZ,
  ArrowUpDown,
  ChevronDown,
  ChevronRight,
  ClipboardCopy,
  CopyPlus,
  Ellipsis,
  FolderInput,
  Layers,
  ListTodo,
  Minimize2,
  Maximize2,
  Plus,
  StickyNote,
  Trash,
} from 'lucide-react'
import { countItems } from '@tabhangar/core'
import {
  cn,
  EmojiPickerPopover,
  IconButton,
  Menu,
  MenuContent,
  MenuItem,
  MenuSeparator,
  MenuSub,
  MenuSubContent,
  MenuSubTrigger,
  MenuTrigger,
} from '@tabhangar/ui'
import { type CSSProperties, type ReactNode, useEffect, useRef, useState } from 'react'
import type { BoardGroup } from '@/db/hooks'
import { updateGroup } from '@/db/repo'
import { useT } from '@/i18n'
import { emojiBaseUrl } from '@/lib/browser'
import { useUi } from '@/state/ui'
import type { ActiveContext } from '../useActive'
import type { BoardActions } from './actions'
import { AddItem } from './AddItem'
import { ItemList } from './ItemList'
import { GroupMoveToOtherWorkspaces } from './MoveTargets'
import { ItemView } from './ItemView'
import { useGroupDnd, useSimpleDrop } from '../dnd/hooks'
import { dndId } from '../dnd/types'

export const DEFAULT_GROUP_WIDTH = 332
const MIN_WIDTH = 260
const MAX_WIDTH = 720

export interface GroupCardProps {
  group: BoardGroup
  index: number
  actions: BoardActions
  active: ActiveContext
  compact?: boolean
  style?: CSSProperties
  className?: string
  /** Rendered instead of the default item list. */
  children?: ReactNode
}

export function GroupCard({
  group,
  index,
  actions,
  active,
  compact,
  style,
  className,
  children,
}: GroupCardProps) {
  const t = useT()
  const [width, setWidth] = useState<number | null>(null)
  const effectiveWidth = compact ? undefined : (width ?? group.width ?? DEFAULT_GROUP_WIDTH)
  const counts = countItems(group.allItems)
  const meta = [
    counts.links ? t('count.links', { count: counts.links }) : null,
    counts.notes ? t('count.notes', { count: counts.notes }) : null,
    counts.tasks ? t('count.tasks', { count: counts.tasks }) : null,
  ].filter(Boolean)
  const dnd = useGroupDnd(group.id, group.categoryId, index, {
    kind: 'group',
    title: group.title || t('group.untitled'),
    subtitle: meta.join(' · '),
    emoji: group.emoji,
    count: 1,
  })

  return (
    <section
      ref={dnd.setNodeRef}
      data-dnd-group={group.id}
      aria-label={group.title || t('group.untitled')}
      style={{ ...style, width: effectiveWidth }}
      className={cn(
        'relative flex shrink-0 flex-col rounded-card bg-card px-[18px] pt-5 pb-4 shadow-card transition-[box-shadow,background] duration-150 dense:px-3.5 dense:pt-3.5 dense:pb-3',
        compact && 'w-full',
        dnd.dragging && 'opacity-40',
        dnd.receiving && 'bg-success-soft shadow-[0_0_0_2px_var(--success),var(--shadow-card)]',
        className,
      )}
    >
      <header
        className="flex cursor-grab items-center gap-3 px-1 pb-3.5 active:cursor-grabbing dense:pb-2.5"
        {...dnd.handleProps}
      >
        {active.settings?.showGroupEmoji !== false && (
          <EmojiPickerPopover
            onSelect={(emoji) => void updateGroup(group.id, { emoji })}
            emojibaseUrl={emojiBaseUrl()}
            locale={active.settings?.locale}
          >
            <button
              type="button"
              aria-label={t('group.changeEmoji')}
              className="flex size-12 shrink-0 items-center justify-center rounded-[14px] text-[36px] leading-none transition-transform hover:scale-105 hover:bg-subtle dense:size-9 dense:text-[26px]"
            >
              {group.emoji}
            </button>
          </EmojiPickerPopover>
        )}
        <div className="min-w-0 flex-1">
          <GroupTitle group={group} />
          <button
            type="button"
            onClick={() => void updateGroup(group.id, { collapsed: !group.collapsed })}
            className="mt-1 inline-flex max-w-full items-center gap-0.5 rounded-[7px] bg-subtle px-2 py-[3px] text-[12px] font-medium text-ink-3 hover:text-ink-2"
          >
            <span className="truncate">{meta.length ? meta.join(' · ') : t('group.empty')}</span>
            {group.collapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
          </button>
        </div>
        <GroupMenu group={group} actions={actions} active={active} />
      </header>

      {!group.collapsed && (
        <>
          {children ?? (
            <ItemList
              groupId={group.id}
              items={group.items}
              renderItem={(item) => (
                <ItemView item={item} group={group} actions={actions} active={active} />
              )}
            />
          )}
          <AddItem groupId={group.id} actions={actions} />
        </>
      )}

      {!compact && (
        <ResizeHandle
          width={effectiveWidth ?? DEFAULT_GROUP_WIDTH}
          onPreview={setWidth}
          onCommit={(next) => {
            setWidth(null)
            void updateGroup(group.id, { width: next })
          }}
          label={t('group.resetWidth')}
        />
      )}
    </section>
  )
}

export function GroupTitle({ group }: { group: BoardGroup }) {
  const t = useT()
  const focusId = useUi((s) => s.focusGroupTitleId)
  const setFocus = useUi((s) => s.setFocusGroupTitle)
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(group.title)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (focusId === group.id) {
      setValue(group.title)
      setEditing(true)
      setFocus(null)
    }
  }, [focusId, group.id, group.title, setFocus])

  useEffect(() => {
    if (editing) {
      ref.current?.focus()
      ref.current?.select()
    }
  }, [editing])

  const commit = () => {
    setEditing(false)
    const next = value.trim()
    if (next !== group.title) void updateGroup(group.id, { title: next })
  }

  if (editing)
    return (
      <input
        ref={ref}
        value={value}
        placeholder={t('group.titlePlaceholder')}
        onChange={(event) => setValue(event.target.value)}
        onPointerDown={(event) => event.stopPropagation()}
        onBlur={commit}
        onKeyDown={(event) => {
          if (event.key === 'Enter') commit()
          if (event.key === 'Escape') {
            setValue(group.title)
            setEditing(false)
          }
        }}
        className="-mx-1 w-[calc(100%+8px)] rounded-lg bg-subtle px-1 text-[17px] font-semibold tracking-[-0.015em] outline-none placeholder:text-ink-4"
      />
    )
  return (
    <h2
      className={cn(
        'cursor-text truncate text-[17px] font-semibold tracking-[-0.015em]',
        !group.title && 'text-ink-4',
      )}
      onClick={() => {
        setValue(group.title)
        setEditing(true)
      }}
    >
      {group.title || t('group.untitled')}
    </h2>
  )
}

export function GroupMenu({
  group,
  actions,
  active,
}: {
  group: BoardGroup
  actions: BoardActions
  active: ActiveContext
}) {
  const t = useT()
  const otherCategories = (active.categories ?? []).filter((cat) => cat.id !== group.categoryId)
  return (
    <Menu>
      <MenuTrigger asChild>
        <IconButton
          label={t('group.options')}
          icon={<Ellipsis size={17} />}
          size="sm"
          tooltip={false}
          className="text-ink-4"
        />
      </MenuTrigger>
      <MenuContent align="end" className="min-w-[240px]">
        <MenuItem icon={<Layers size={15} />} onSelect={() => void actions.openGroup(group)}>
          {t('group.openAll')}
        </MenuItem>
        <MenuItem
          icon={<AppWindow size={15} />}
          onSelect={() => void actions.openGroup(group, true)}
        >
          {t('group.openInWindow')}
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<StickyNote size={15} />} onSelect={() => void actions.addNote(group.id)}>
          {t('group.addNote')}
        </MenuItem>
        <MenuItem
          icon={<ListTodo size={15} />}
          onSelect={() => void actions.addNote(group.id, {}, true)}
        >
          {t('note.todo')}
        </MenuItem>
        <MenuSeparator />
        <MenuItem icon={<CopyPlus size={15} />} onSelect={() => void actions.duplicateGroup(group)}>
          {t('group.duplicate')}
        </MenuItem>
        <MenuItem icon={<ClipboardCopy size={15} />} onSelect={() => void actions.copyGroup(group)}>
          {t('group.copyAsText')}
        </MenuItem>
        <MenuSub>
          <MenuSubTrigger icon={<FolderInput size={15} />}>{t('group.moveTo')}</MenuSubTrigger>
          <MenuSubContent className="min-w-[220px]">
            {otherCategories.map((cat) => (
              <MenuItem key={cat.id} onSelect={() => void actions.moveGroupTo(group, cat.id)}>
                {cat.name}
              </MenuItem>
            ))}
            {active.workspace && (
              <GroupMoveToOtherWorkspaces groupId={group.id} workspaceId={active.workspace.id} />
            )}
          </MenuSubContent>
        </MenuSub>
        <MenuSub>
          <MenuSubTrigger icon={<ArrowUpDown size={15} />}>{t('group.sortBy')}</MenuSubTrigger>
          <MenuSubContent>
            <MenuItem
              icon={<ArrowDownAZ size={15} />}
              onSelect={() => void actions.sortGroup(group, 'title')}
            >
              {t('group.sortTitle')}
            </MenuItem>
            <MenuItem onSelect={() => void actions.sortGroup(group, 'newest')}>
              {t('group.sortNewest')}
            </MenuItem>
            <MenuItem onSelect={() => void actions.sortGroup(group, 'oldest')}>
              {t('group.sortOldest')}
            </MenuItem>
          </MenuSubContent>
        </MenuSub>
        <MenuItem
          icon={group.collapsed ? <Maximize2 size={15} /> : <Minimize2 size={15} />}
          onSelect={() => void updateGroup(group.id, { collapsed: !group.collapsed })}
        >
          {group.collapsed ? t('group.expand') : t('group.collapse')}
        </MenuItem>
        <MenuSeparator />
        <MenuItem
          icon={<Trash size={15} />}
          danger
          onSelect={() => void actions.deleteGroup(group)}
        >
          {t('group.delete')}
        </MenuItem>
      </MenuContent>
    </Menu>
  )
}

function ResizeHandle({
  width,
  onPreview,
  onCommit,
  label,
}: {
  width: number
  onPreview: (width: number) => void
  onCommit: (width: number | null) => void
  label: string
}) {
  const start = useRef<{ x: number; width: number } | null>(null)
  const latest = useRef(width)
  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      title={label}
      onDoubleClick={() => onCommit(null)}
      onPointerDown={(event) => {
        event.preventDefault()
        event.currentTarget.setPointerCapture(event.pointerId)
        start.current = { x: event.clientX, width }
        latest.current = width
      }}
      onPointerMove={(event) => {
        if (!start.current) return
        const next = Math.round(
          Math.min(
            MAX_WIDTH,
            Math.max(MIN_WIDTH, start.current.width + event.clientX - start.current.x),
          ),
        )
        latest.current = next
        onPreview(next)
      }}
      onPointerUp={() => {
        if (!start.current) return
        start.current = null
        onCommit(latest.current)
      }}
      className="group/resize absolute top-6 -right-2.5 bottom-6 flex w-5 cursor-col-resize justify-center"
    >
      <span className="h-full w-[3px] rounded-full bg-transparent transition-colors group-hover/resize:bg-accent/40" />
    </div>
  )
}

export function NewGroupColumn({
  onCreate,
  label,
  hint,
}: {
  onCreate: () => void
  label: string
  hint: string
}) {
  const { setNodeRef, active } = useSimpleDrop(dndId.newGroup, { zone: 'newGroup' })
  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onCreate}
      className={cn(
        'flex min-h-[220px] w-[280px] shrink-0 flex-col items-center justify-center gap-2.5 rounded-card border-2 border-dashed border-line p-6 text-center text-ink-3 transition-colors hover:border-accent/40 hover:text-ink-2',
        active && 'border-success bg-success-soft text-ink',
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-[14px] bg-subtle-2">
        <Plus size={20} />
      </span>
      <span className="text-[14px] font-semibold text-ink-2">{label}</span>
      <span className="text-[12.5px] leading-snug">
        {hint} <kbd className="rounded-[5px] bg-subtle-2 px-1.5 font-sans">G</kbd>
      </span>
    </button>
  )
}
