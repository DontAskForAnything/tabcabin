/** "3 minutes ago", "yesterday", … in the given locale. */
export function relativeTime(ts: number, locale: string, now = Date.now()): string {
  const seconds = Math.round((ts - now) / 1000)
  const format = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' })
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [
    ['day', 86_400],
    ['hour', 3_600],
    ['minute', 60],
  ]
  for (const [unit, size] of steps)
    if (Math.abs(seconds) >= size) return format.format(Math.round(seconds / size), unit)
  return format.format(0, 'minute')
}
