import { SquareStack } from 'lucide-react'
import { ContextMenuItem } from '@tabcabin/ui'
import type { BoardItem } from '@/db/hooks'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'
import { canCombine } from '../dnd/logic'
import type { BoardActions } from './actions'

const kindOf = (id: string) =>
  document.querySelector<HTMLElement>(`[data-dnd-item="${CSS.escape(id)}"]`)?.dataset.dndKind ?? ''

/**
 * "Stack N links" in the right-click menu of a picked link or stack: the other picked ones go
 * into it, as if each was dropped onto it.
 */
export function StackPickedItem({ item, actions }: { item: BoardItem; actions: BoardActions }) {
  const t = useT()
  const selection = useUi((s) => s.selection)
  const others = selection.filter((id) => id !== item.id)
  const fits =
    selection.includes(item.id) &&
    others.length > 0 &&
    item.parentId === null &&
    canCombine(others.map(kindOf), item.kind)
  if (!fits) return null
  return (
    <ContextMenuItem
      icon={<SquareStack size={14} />}
      onSelect={() => void actions.combine(others, item.id)}
    >
      {t('selection.stackCount', { count: selection.length })}
    </ContextMenuItem>
  )
}
