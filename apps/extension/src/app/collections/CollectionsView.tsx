import { Plus } from 'lucide-react'
import { Fragment } from 'react'
import { cn } from '@tabhangar/ui'
import type { BoardGroup } from '@/db/hooks'
import { useT } from '@/i18n'
import type { BoardActions } from '../board/actions'
import { GroupMenu, GroupTitle } from '../board/GroupCard'
import type { ActiveContext } from '../useActive'
import { GroupDropLine } from '../dnd/DropMarkers'
import { useGroupInsertIndex, useSimpleDrop } from '../dnd/hooks'
import { dndId } from '../dnd/types'
import { CollectionSection } from './CollectionSection'

export function CollectionsView({
  groups,
  actions,
  active,
  compact,
}: {
  groups: BoardGroup[]
  actions: BoardActions
  active: ActiveContext
  compact: boolean
}) {
  const t = useT()
  const insertAt = useGroupInsertIndex(active.category?.id ?? '')
  const newGroup = useSimpleDrop(dndId.newGroup, { zone: 'newGroup' })
  return (
    <div
      className={cn(
        'flex flex-1 flex-col gap-5 overflow-y-auto pb-10',
        compact ? 'px-4' : 'px-7 pt-1.5',
      )}
    >
      {groups.map((group, index) => (
        <Fragment key={group.id}>
          {insertAt === index && <GroupDropLine axis="y" />}
          <CollectionSection
            index={index}
            group={group}
            actions={actions}
            active={active}
            title={<GroupTitle group={group} />}
            menu={<GroupMenu group={group} actions={actions} active={active} />}
          />
        </Fragment>
      ))}
      {insertAt !== null && insertAt >= groups.length && <GroupDropLine axis="y" />}
      <button
        ref={newGroup.setNodeRef}
        type="button"
        onClick={() => void actions.createGroup()}
        className={cn(
          'flex h-16 items-center justify-center gap-2 rounded-card border-2 border-dashed border-line text-[14px] font-semibold text-ink-3 transition-colors hover:border-accent/40 hover:text-ink-2',
          newGroup.active && 'border-success bg-success-soft text-ink',
        )}
      >
        <Plus size={18} />
        {t('group.new')}
      </button>
    </div>
  )
}
