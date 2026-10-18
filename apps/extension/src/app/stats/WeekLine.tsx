import { Sprout } from 'lucide-react'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'
import { useWeekStats } from './useWeekStats'

/** One quiet line in the tabs panel about the week, when there is something to say. */
export function WeekLine() {
  const t = useT()
  const { stats } = useWeekStats()
  const openModal = useUi((s) => s.openModal)
  if (!stats) return null
  const text = stats.closedTabs
    ? t('stats.closedThisWeek', { count: stats.closedTabs })
    : stats.savedLinks
      ? t('stats.savedThisWeek', { count: stats.savedLinks })
      : null
  if (!text) return null
  return (
    <button
      type="button"
      onClick={() => openModal({ type: 'week' })}
      className="-mb-1 flex items-center justify-center gap-1.5 rounded-lg py-1 text-[12.5px] text-ink-3 transition-colors hover:text-ink-2"
    >
      <Sprout size={13} className="text-accent-ink" />
      {text}
    </button>
  )
}
