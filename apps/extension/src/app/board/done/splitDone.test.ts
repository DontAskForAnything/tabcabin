import { describe, expect, it } from 'vitest'
import { splitDone } from './splitDone'

const note = (id: string, todo: boolean, done: boolean) => ({
  id,
  kind: 'note' as const,
  todo,
  done,
})

describe('splitDone', () => {
  const items = [
    note('a', true, false),
    note('b', true, true),
    { id: 'c', kind: 'link' as const, todo: false, done: true },
    note('d', false, true),
    note('e', true, true),
  ]

  it('folds away ticked to-dos and keeps everything else in order', () => {
    const { open, done, landing } = splitDone(items, {})
    expect(open.map((item) => item.id)).toEqual(['a', 'c', 'd'])
    expect(done.map((item) => item.id)).toEqual(['b', 'e'])
    expect(landing).toBe(false)
  })

  it('keeps a to-do in the list while it is being crossed out', () => {
    const { open, done, landing } = splitDone(items, { e: 'striking' })
    expect(open.map((item) => item.id)).toEqual(['a', 'c', 'd', 'e'])
    expect(done.map((item) => item.id)).toEqual(['b'])
    expect(landing).toBe(true)
  })
})
