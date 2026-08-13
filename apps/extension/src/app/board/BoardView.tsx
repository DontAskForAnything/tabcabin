import { Plus } from 'lucide-react'
import { Button, cn } from '@tabhangar/ui'
import { useBoard } from '@/db/hooks'
import { useT } from '@/i18n'
import type { ActiveContext } from '../useActive'
import { useBoardActions } from './actions'
import { GroupCard, NewGroupColumn } from './GroupCard'

export function BoardView({ active, compact }: { active: ActiveContext; compact: boolean }) {
  const t = useT()
  const groups = useBoard(active.category?.id)
  const actions = useBoardActions(active)
  if (!groups) return null

  if (groups.length === 0)
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 pb-24 text-center">
        <div className="text-[44px]">🛩️</div>
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

  return (
    <div
      className={cn(
        'flex flex-1 gap-5 pb-7',
        compact ? 'flex-col px-4' : 'items-start overflow-x-auto px-7 pt-1.5',
      )}
    >
      {groups.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          actions={actions}
          active={active}
          compact={compact}
        />
      ))}
      <NewGroupColumn
        onCreate={() => void actions.createGroup()}
        label={t('group.new')}
        hint={t('group.newHint')}
      />
    </div>
  )
}
