import { makeTag, TAG_LIMITS } from '@tabcabin/core'
import { describe, expect, it } from 'vitest'
import { addDraftTag, type DraftTag } from './draftTags'

const clock = { now: Date.UTC(2026, 10, 16) }
const work = makeTag({ name: 'Work', color: 'rose', position: 'a0' }, clock)

describe('tags chosen in a form', () => {
  it('takes the account tag by name, or plans a new one in the next colour', () => {
    const first = addDraftTag([], [work], '#work')
    expect(first).toEqual({
      ok: true,
      draft: [{ id: work.id, name: 'Work', color: 'rose', isNew: false }],
    })
    const second = addDraftTag(first.ok ? first.draft : [], [work], 'Ops ')
    expect(second.ok && second.draft[1]).toEqual({
      id: 'new:ops',
      name: 'Ops',
      color: 'amber',
      isNew: true,
    })
    // The same name again changes nothing.
    expect(addDraftTag(second.ok ? second.draft : [], [work], 'OPS')).toEqual(second)
  })

  it('stops at the limits of the item and of the account', () => {
    const five: DraftTag[] = Array.from({ length: TAG_LIMITS.perItem }, (_, i) => ({
      id: `t${i}`,
      name: `t${i}`,
      color: 'sky',
      isNew: false,
    }))
    expect(addDraftTag(five, [], 'more')).toEqual({ ok: false, error: 'item' })
    const full = Array.from({ length: TAG_LIMITS.perAccount }, (_, i) =>
      makeTag({ name: `n${i}`, color: 'sky', position: `a${i}` }, clock),
    )
    expect(addDraftTag([], full, 'new one')).toEqual({ ok: false, error: 'account' })
    expect(addDraftTag([], full, 'N3').ok).toBe(true)
  })
})
