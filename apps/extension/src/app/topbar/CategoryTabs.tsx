import { ArrowLeft, ArrowRight, Pencil, Plus, Settings2, Trash } from 'lucide-react'
import {
  cn,
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
  IconButton,
} from '@tabhangar/ui'
import type { Category } from '@tabhangar/core'
import { type ComponentProps, useEffect, useRef, useState } from 'react'
import { createCategory, deleteCategory, moveCategory, updateCategory } from '@/db/repo'
import { useT } from '@/i18n'
import { confirmDialog } from '@/state/confirm'
import { useUi } from '@/state/ui'
import { offerUndo } from '@/state/undo'
import { useSimpleDrop } from '../dnd/hooks'
import { dndId } from '../dnd/types'
import { setActiveCategory, type ActiveContext } from '../useActive'

const LONG_PRESS_MS = 450

export function CategoryTabs({ active }: { active: ActiveContext }) {
  const t = useT()
  const openModal = useUi((s) => s.openModal)
  const { categories, category, workspace, settings } = active
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const longPressed = useRef(false)

  if (!workspace || !categories || !settings) return null

  const select = (cat: Category) => void setActiveCategory(settings, workspace.id, cat.id)

  const add = async () => {
    const { categoryId } = await createCategory(workspace.id, t('category.defaultName'))
    await setActiveCategory(settings, workspace.id, categoryId)
    setRenamingId(categoryId)
  }

  const remove = async (cat: Category) => {
    const ok = await confirmDialog({
      title: t('category.delete'),
      description: t('category.deleteConfirm', { name: cat.name }),
      confirmLabel: t('common.delete'),
      cancelLabel: t('common.cancel'),
      danger: true,
    })
    if (!ok) return
    const result = await deleteCategory(cat.id)
    offerUndo(result, { title: t('category.deleted'), undoLabel: t('common.undo') })
  }

  const startPress = () => {
    longPressed.current = false
    pressTimer.current = setTimeout(() => {
      longPressed.current = true
      openModal({ type: 'categories' })
    }, LONG_PRESS_MS)
  }
  const endPress = () => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
  }

  return (
    <div
      role="tablist"
      aria-label={t('category.label')}
      className="flex flex-wrap items-center gap-0.5 rounded-[13px] bg-subtle-2 p-1"
    >
      {categories.map((cat, index) => {
        const selected = cat.id === category?.id
        if (renamingId === cat.id)
          return (
            <RenameInput
              key={cat.id}
              initial={cat.name}
              onDone={(name) => {
                setRenamingId(null)
                if (name && name !== cat.name) void updateCategory(cat.id, { name })
              }}
            />
          )
        return (
          <ContextMenu key={cat.id}>
            <ContextMenuTrigger asChild>
              <CategoryDropTab
                categoryId={cat.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onPointerDown={startPress}
                onPointerUp={endPress}
                onPointerLeave={endPress}
                onClick={() => {
                  if (!longPressed.current) select(cat)
                }}
                onDoubleClick={() => setRenamingId(cat.id)}
                className={cn(
                  'h-8 max-w-[200px] truncate rounded-[10px] px-4 text-[13.5px] transition-[background,color,box-shadow] duration-150',
                  selected
                    ? 'bg-accent font-semibold text-on-accent shadow-glow'
                    : 'font-medium text-ink-2 hover:text-ink',
                )}
              >
                {cat.name || t('category.defaultName')}
              </CategoryDropTab>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem icon={<Pencil size={14} />} onSelect={() => setRenamingId(cat.id)}>
                {t('category.rename')}
              </ContextMenuItem>
              <ContextMenuItem
                icon={<ArrowLeft size={14} />}
                disabled={index === 0}
                onSelect={() =>
                  void moveCategory(cat.id, { workspaceId: workspace.id, index: index - 1 })
                }
              >
                {t('category.moveLeft')}
              </ContextMenuItem>
              <ContextMenuItem
                icon={<ArrowRight size={14} />}
                disabled={index === categories.length - 1}
                onSelect={() =>
                  void moveCategory(cat.id, { workspaceId: workspace.id, index: index + 1 })
                }
              >
                {t('category.moveRight')}
              </ContextMenuItem>
              <ContextMenuItem
                icon={<Settings2 size={14} />}
                onSelect={() => openModal({ type: 'categories' })}
              >
                {t('category.manage')}
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                icon={<Trash size={14} />}
                danger
                disabled={categories.length <= 1}
                onSelect={() => void remove(cat)}
              >
                {t('category.delete')}
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        )
      })}
      <IconButton
        label={t('category.new')}
        icon={<Plus size={15} />}
        size="sm"
        onClick={() => void add()}
      />
    </div>
  )
}

function CategoryDropTab({
  categoryId,
  className,
  ref,
  ...props
}: ComponentProps<'button'> & { categoryId: string }) {
  const { setNodeRef, active } = useSimpleDrop(dndId.category(categoryId), {
    zone: 'category',
    categoryId,
  })
  return (
    <button
      ref={(node) => {
        setNodeRef(node)
        if (typeof ref === 'function') ref(node)
        else if (ref) ref.current = node
      }}
      type="button"
      className={cn(className, active && 'shadow-[0_0_0_2px_var(--success)]')}
      {...props}
    />
  )
}

function RenameInput({ initial, onDone }: { initial: string; onDone: (value: string) => void }) {
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
      onChange={(event) => setValue(event.target.value)}
      onBlur={() => onDone(value.trim())}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onDone(value.trim())
        if (event.key === 'Escape') onDone(initial)
      }}
      size={Math.max(6, value.length + 1)}
      className="h-8 rounded-[10px] bg-card px-3 text-[13.5px] font-semibold text-ink shadow-tile outline-none"
    />
  )
}
