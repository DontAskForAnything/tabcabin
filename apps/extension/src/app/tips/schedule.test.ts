import { beforeEach, describe, expect, it } from 'vitest'
import { DAY } from '@/db/activity/days'
import { db } from '@/db/db'
import { AGAIN_AFTER, dueTip, FIRST_AFTER, getTips, putAway, startTips } from './schedule'

const tips = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
const now = Date.UTC(2026, 9, 28, 9)

describe('dueTip', () => {
  it('shows nothing before the wait is over', () => {
    expect(dueTip(tips, undefined, now)).toBeNull()
    expect(dueTip(tips, { seen: [], nextAt: now + 1 }, now)).toBeNull()
  })

  it('shows the first tip not seen yet, and nothing once all are seen', () => {
    expect(dueTip(tips, { seen: ['a'], nextAt: now }, now)).toEqual({ id: 'b' })
    expect(dueTip(tips, { seen: ['a', 'b', 'c'], nextAt: now }, now)).toBeNull()
  })
})

describe('the tips schedule', () => {
  beforeEach(async () => {
    await db.meta.clear()
  })

  it('waits three days for the first tip, then two days after each one put away', async () => {
    await startTips(now)
    await startTips(now + DAY)
    expect(await getTips()).toEqual({ seen: [], nextAt: now + FIRST_AFTER })

    const later = now + FIRST_AFTER
    await putAway('a', { wait: false }, later)
    expect(dueTip(tips, await getTips(), later)).toEqual({ id: 'b' })

    await putAway('b', { wait: true }, later)
    expect(dueTip(tips, await getTips(), later + DAY)).toBeNull()
    expect(dueTip(tips, await getTips(), later + AGAIN_AFTER)).toEqual({ id: 'c' })
  })
})
