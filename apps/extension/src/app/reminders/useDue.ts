import { isDue } from '@tabhangar/core'
import { useEffect, useState } from 'react'
import { useReminders } from '@/db/reminders'

/** Current time, refreshed every `interval` ms. */
export function useNow(interval = 30_000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), interval)
    return () => clearInterval(timer)
  }, [interval])
  return now
}

export function useDueCount(): number {
  const reminders = useReminders()
  const now = useNow()
  return reminders?.filter((entry) => isDue(entry.reminder, now)).length ?? 0
}
