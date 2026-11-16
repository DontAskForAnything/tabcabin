import { makeItem } from '@tabcabin/core'
import { describe, expect, it } from 'vitest'
import type { BoardItem } from '@/db/hooks'
import { filterByTags } from './filterBoard'

const clock = { now: Date.UTC(2026, 10, 16) }
const item = (title: string, tagIds: string[] = [], children: BoardItem[] = []): BoardItem => ({
  ...makeItem({ kind: 'link', groupId: 'g', position: 'a0', title, tagIds }, clock),
  children,
})

describe('filtering the board by tags', () => {
  const groups = [
    {
      id: 'g1',
      items: [
        item('tagged', ['work']),
        item('plain'),
        item('stack', [], [item('inside', ['work'])]),
        item('link with a tagged note', [], [item('note', ['uni'])]),
      ],
    },
    { id: 'g2', items: [item('other', ['later'])] },
  ]

  it('keeps every item without a filter', () => {
    expect(filterByTags(groups, new Set())).toEqual(groups)
  })

  it('keeps items with one of the tags, also through what is inside them', () => {
    const shown = filterByTags(groups, new Set(['work', 'uni']))
    expect(shown[0]!.items.map((i) => i.title)).toEqual([
      'tagged',
      'stack',
      'link with a tagged note',
    ])
    expect(shown[1]).toMatchObject({ id: 'g2', items: [], filtered: true })
  })
})
