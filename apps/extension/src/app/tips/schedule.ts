import { DAY } from '@/db/activity/days'
import { db } from '@/db/db'

/**
 * When tips show: the first one three days after TabCabin was first opened (the welcome has its
 * own), then at most one every two days, each tip once. Kept in this browser only.
 */
const TIPS_KEY = 'tips'

export const FIRST_AFTER = 3 * DAY
export const AGAIN_AFTER = 2 * DAY

export interface TipsState {
  /** Ids of the tips already shown and put away. */
  seen: string[]
  /** No tip before this time. */
  nextAt: number
}

/** The tip to show now, if any: the first one not seen yet, once the wait is over. */
export function dueTip<T extends { id: string }>(
  tips: readonly T[],
  state: TipsState | undefined,
  now: number,
): T | null {
  if (!state || now < state.nextAt) return null
  return tips.find((tip) => !state.seen.includes(tip.id)) ?? null
}

export async function getTips(): Promise<TipsState | undefined> {
  return (await db.meta.get(TIPS_KEY))?.value as TipsState | undefined
}

async function update(change: (state: TipsState | undefined) => TipsState | undefined) {
  await db.transaction('rw', db.meta, async () => {
    const next = change(await getTips())
    if (next) await db.meta.put({ key: TIPS_KEY, value: next })
  })
}

/** Starts the wait for the first tip (the new tab page calls it when it opens). */
export function startTips(now = Date.now()) {
  return update((state) => (state ? undefined : { seen: [], nextAt: now + FIRST_AFTER }))
}

/**
 * A tip was put away. Closing it or following it waits two days for the next one; "Next tip"
 * shows the next one at once.
 */
export function putAway(id: string, { wait }: { wait: boolean }, now = Date.now()) {
  return update((state) => ({
    seen: [...new Set([...(state?.seen ?? []), id])],
    nextAt: wait ? now + AGAIN_AFTER : (state?.nextAt ?? now),
  }))
}
