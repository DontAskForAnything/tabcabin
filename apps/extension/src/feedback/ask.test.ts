import { beforeEach, describe, expect, it } from 'vitest'
import { DAY } from '@/db/activity/days'
import { db } from '@/db/db'
import { askLater, getAsk, isDue, noteVisit, stopAsking } from './ask'

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
})

const start = new Date('2026-10-01T10:00:00').getTime()

async function useOn(days: number[]) {
  for (const day of days) {
    await noteVisit(start + day * DAY)
    await noteVisit(start + day * DAY + 3_600_000)
  }
}

describe('the two-week question', () => {
  it('waits for two weeks and five days of use', async () => {
    await useOn([0, 1, 2, 3])
    expect(isDue(await getAsk(), start + 20 * DAY)).toBe(false)
    await useOn([5])
    expect(isDue(await getAsk(), start + 13 * DAY)).toBe(false)
    expect(isDue(await getAsk(), start + 14 * DAY)).toBe(true)
    expect(await getAsk()).toMatchObject({ daysUsed: 5, since: start })
  })

  it('asks once more a month after "Not now", then never', async () => {
    await useOn([0, 1, 2, 3, 4])
    const first = start + 15 * DAY
    await askLater(first)
    expect(isDue(await getAsk(), first + 29 * DAY)).toBe(false)
    expect(isDue(await getAsk(), first + 30 * DAY)).toBe(true)
    await askLater(first + 30 * DAY)
    expect(await getAsk()).toMatchObject({ state: 'done' })
    expect(isDue(await getAsk(), first + 365 * DAY)).toBe(false)
  })

  it('stops after a rating or a message, even before it was asked', async () => {
    await stopAsking(start)
    await useOn([1, 2, 3, 4, 5])
    expect(await getAsk()).toMatchObject({ state: 'done' })
    expect(isDue(await getAsk(), start + 60 * DAY)).toBe(false)
  })
})
