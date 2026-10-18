import { DAY, dayKey } from '@/db/activity/days'
import { db } from '@/db/db'

/**
 * The one-time question "How is TabCabin working for you?". It waits for two weeks and five days
 * of use; "Not now" brings it back once, a month later. Kept in this browser only.
 */
const ASK_KEY = 'feedback.ask'

const WAIT = 14 * DAY
const DAYS_OF_USE = 5
const AGAIN_AFTER = 30 * DAY

export interface FeedbackAsk {
  /** First new tab seen with this version (the install, or the update that brought the question). */
  since: number
  /** Days with at least one new tab, counted up to DAYS_OF_USE. */
  daysUsed: number
  lastDay: string
  state: 'waiting' | 'later' | 'done'
  /** When a "Not now" asks again. */
  askAgainAt?: number
}

export function isDue(ask: FeedbackAsk | undefined, now: number): boolean {
  if (!ask) return false
  if (ask.state === 'waiting') return now - ask.since >= WAIT && ask.daysUsed >= DAYS_OF_USE
  if (ask.state === 'later') return now >= (ask.askAgainAt ?? Infinity)
  return false
}

export async function getAsk(): Promise<FeedbackAsk | undefined> {
  return (await db.meta.get(ASK_KEY))?.value as FeedbackAsk | undefined
}

async function update(change: (ask: FeedbackAsk | undefined) => FeedbackAsk | undefined) {
  await db.transaction('rw', db.meta, async () => {
    const next = change(await getAsk())
    if (next) await db.meta.put({ key: ASK_KEY, value: next })
  })
}

/** Counts today as a day of use (the new tab page calls it once per opening). */
export function noteVisit(now = Date.now()) {
  const today = dayKey(now)
  return update((ask) => {
    if (!ask) return { since: now, daysUsed: 1, lastDay: today, state: 'waiting' }
    if (ask.lastDay === today || ask.daysUsed >= DAYS_OF_USE) return undefined
    return { ...ask, daysUsed: ask.daysUsed + 1, lastDay: today }
  })
}

/** "Not now": once more in a month, after that never. */
export function askLater(now = Date.now()) {
  return update((ask) =>
    ask?.state === 'waiting'
      ? { ...ask, state: 'later', askAgainAt: now + AGAIN_AFTER }
      : ask && { ...ask, state: 'done' },
  )
}

/** Rated or sent a message: never ask again. */
export function stopAsking(now = Date.now()) {
  return update((ask) => ({
    ...(ask ?? { since: now, daysUsed: 0, lastDay: dayKey(now) }),
    state: 'done',
  }))
}
