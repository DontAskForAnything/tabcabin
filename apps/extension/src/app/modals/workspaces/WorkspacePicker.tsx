import { Button, Input, Modal } from '@tabcabin/ui'
import { Plus, Search } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useOverview } from '@/db/overview'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'
import { setActiveCategory, type ActiveContext } from '../../useActive'
import { WorkspaceRow } from './WorkspaceRow'
import type { Cell } from './cell'

export function WorkspacePicker({ open, active }: { open: boolean; active: ActiveContext }) {
  const t = useT()
  const close = useUi((s) => s.closeModal)
  const openModal = useUi((s) => s.openModal)
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
            onClick={() => openModal({ type: 'newWorkspace' })}
          >
            {t('workspace.new')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
