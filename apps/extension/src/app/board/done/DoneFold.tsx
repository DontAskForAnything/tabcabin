import { cn } from '@tabcabin/ui'
import { Check, ChevronDown, ChevronRight } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { BoardGroup, BoardItem } from '@/db/hooks'
import { useT } from '@/i18n'
import type { ActiveContext } from '../../useActive'
import type { BoardActions } from '../actions'
import { useBoardContext } from '../BoardContext'
import { ItemContextMenu } from '../ItemContextMenu'
import { ItemView } from '../ItemView'
import './done.css'

/**
 * Ticked-off to-dos fold away under a group, so the list keeps only what is left to do. The pill
 * counts them and opens them again; it is laid out (invisible) while the first one flies in, so
 * the flight has somewhere to land.
 */
export function DoneFold({
  group,
  done,
  landing,
  actions,
  active,
}: {
  group: BoardGroup
  done: BoardItem[]
  landing: boolean
  actions: BoardActions
  active: ActiveContext
}) {
  const t = useT()
  const [open, setOpen] = useState(false)
  const bump = useBump(done.length)
  const board = useBoardContext()
  const empty = done.length === 0
  // Closes once its last to-do is gone, so the next one lands in a closed fold.
  useEffect(() => {
    if (empty) setOpen(false)
  }, [empty])
  if (empty && !landing) return null
  const Chevron = open ? ChevronDown : ChevronRight
  return (
    <div data-done-fold={group.id} className="mt-2.5 flex flex-col gap-1.5 dense:mt-1.5">
      <button
        type="button"
        data-done-pill
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className={cn(
          'inline-flex items-center gap-1 self-start rounded-[7px] bg-subtle px-2 py-[3px] text-[12px] font-medium text-ink-3 transition-colors hover:text-ink-2',
          empty && 'invisible',
          bump && 'done-bump',
        )}
      >
        <Check size={12} strokeWidth={2.6} className="text-accent-ink" />
        {t('done.count', { count: done.length })}
        <Chevron size={12} />
      </button>
      {open && !empty && (
        <div className="flex flex-col gap-1.5 dense:gap-0.5">
          {done.map((item) => {
            const view = (
              <div key={item.id}>
                <ItemView item={item} group={group} actions={actions} active={active} />
              </div>
            )
            return board ? (
              <ItemContextMenu
                key={item.id}
                item={item}
                groups={board.groups}
                actions={board.actions}
              >
                {view}
              </ItemContextMenu>
            ) : (
              view
            )
          })}
          <button
            type="button"
            onClick={() => void actions.deleteItems(done.map((item) => item.id))}
            className="self-end rounded-md px-1 text-[12px] text-ink-3 hover:text-ink hover:underline"
          >
            {t('done.delete')}
          </button>
        </div>
      )}
    </div>
  )
}

/** True for a moment after the count goes up (another to-do landed). */
function useBump(count: number) {
  const [bumping, setBumping] = useState(false)
  const last = useRef(count)
  useEffect(() => {
    const grew = count > last.current
    last.current = count
    if (!grew) return
    setBumping(true)
    const timer = setTimeout(() => setBumping(false), 450)
    return () => clearTimeout(timer)
  }, [count])
  return bumping
}
