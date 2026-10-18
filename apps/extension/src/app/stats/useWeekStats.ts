import { useLiveQuery } from 'dexie-react-hooks'
import { loadWeek, type WeekStats } from '@/db/activity/week'
import { useAccount } from '@/sync/state'

/** The week's numbers: of every computer of the account when signed in, else of this browser. */
export function useWeekStats(): { stats: WeekStats | undefined; everywhere: boolean } {
  const account = useAccount()
  const everywhere = !!account?.token && account.initialized
  const stats = useLiveQuery(() => loadWeek(Date.now(), everywhere), [everywhere])
  return { stats, everywhere }
}
