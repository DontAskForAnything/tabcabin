import { Modal } from '@tabcabin/ui'
import { useWeekStats } from '@/db/stats'
import { useT } from '@/i18n'
import { useUi } from '@/state/ui'

/** The last seven days in three numbers. No streaks, no goals, nothing to keep up. */
export function WeekDialog({ open }: { open: boolean }) {
  const t = useT()
  const close = useUi((s) => s.closeModal)
  const stats = useWeekStats()
  const tiles: [number, string][] = stats
    ? [
        [stats.closedTabs, t('stats.tabsClosed', { count: stats.closedTabs })],
        [stats.savedLinks, t('stats.linksSaved', { count: stats.savedLinks })],
        [stats.doneTasks, t('stats.tasksDone', { count: stats.doneTasks })],
      ]
    : []
  return (
    <Modal
      open={open}
      onOpenChange={(value) => !value && close()}
      title={t('stats.title')}
      description={t('stats.hint')}
      size="md"
    >
      <dl className="grid grid-cols-3 gap-3">
        {tiles.map(([value, label]) => (
          <div
            key={label}
            className="flex flex-col-reverse gap-1 rounded-[16px] bg-subtle px-4 py-4"
          >
            <dt className="text-[13px] leading-snug text-ink-3">{label}</dt>
            <dd className="font-display text-[34px] leading-none font-bold tracking-[-0.03em] text-accent-ink">
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </Modal>
  )
}
