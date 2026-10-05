import { Plus } from 'lucide-react'
import { Fragment, useMemo } from 'react'
import { Button, cn } from '@tabhangar/ui'
import { CabinMark } from '@/app/shared/CabinMark'
import { useBoard } from '@/db/hooks'
import { useT } from '@/i18n'
import type { ActiveContext } from '../useActive'
import { CollectionsView } from '../collections/CollectionsView'
import { GroupDropLine } from '../dnd/DropMarkers'
import { useGroupInsertIndex } from '../dnd/hooks'
import { useBoardActions } from './actions'
import { BoardContext } from './BoardContext'
import { GroupCard } from './group/GroupCard'
import { NewGroupColumn } from './group/NewGroupColumn'

export function BoardView({ active, compact }: { active: ActiveContext; compact: boolean }) {
  const t = useT()
  const groups = useBoard(active.category?.id)
  const actions = useBoardActions(active)
  const insertAt = useGroupInsertIndex(active.category?.id ?? '')
  const context = useMemo(
    () => ({
      actions,
      groups: (groups ?? []).map((group) => ({
        id: group.id,
        title: group.title,
        emoji: group.emoji,
      })),
    }),
    [actions, groups],
  )
  if (!groups) return null

  if (groups.length === 0)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 pb-24 text-center">
        <CabinMark size={56} />
        <h2 className="text-[19px] font-semibold tracking-[-0.015em]">{t('empty.category')}</h2>
        <p className="max-w-[360px] text-[14px] text-ink-3">{t('empty.categoryHint')}</p>
        <Button
          variant="primary"
          icon={<Plus size={16} />}
          onClick={() => void actions.createGroup()}
        >
          {t('group.new')}
        </Button>
      </div>
    )

  const view = (active.category && active.settings?.viewModes[active.category.id]) || 'board'
  if (view === 'collections')
    return (
      <BoardContext.Provider value={context}>
        <CollectionsView groups={groups} actions={actions} active={active} compact={compact} />
      </BoardContext.Provider>
    )

  return (
    <BoardContext.Provider value={context}>
      <div
        className={cn(
          'flex flex-1 gap-5 pb-7 dense:gap-3.5',
          compact ? 'flex-col px-4' : 'items-start overflow-x-auto px-7 pt-1.5',
        )}
      >
        {groups.map((group, index) => (
          <Fragment key={group.id}>
            {insertAt === index && <GroupDropLine axis={compact ? 'y' : 'x'} />}
            <GroupCard
              group={group}
              index={index}
              actions={actions}
              active={active}
              compact={compact}
            />
          </Fragment>
        ))}
        {insertAt !== null && insertAt >= groups.length && (
          <GroupDropLine axis={compact ? 'y' : 'x'} />
        )}
        <NewGroupColumn
          onCreate={() => void actions.createGroup()}
          label={t('group.new')}
          hint={t('group.newHint')}
        />
      </div>
    </BoardContext.Provider>
  )
}
