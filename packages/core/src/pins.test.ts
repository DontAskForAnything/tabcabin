import { describe, expect, it } from 'vitest'
import { makeItem, makeLink, makeNote } from './factories'
import { canNest, detachLinkText, pinNotes, unpinNotes } from './pins'
import { positionsAtEnd, sortByPosition } from './position'

const clock = { now: 1_000 }
const later = { now: 2_000 }

const [p1, p2, p3] = positionsAtEnd([], 3)
const link = makeLink({ groupId: 'g1', position: p1!, url: 'https://a.com' }, clock)
const next = makeLink({ groupId: 'g1', position: p2!, url: 'https://b.com' }, clock)
const pin = (text: string, position: string) => ({
  ...makeNote({ groupId: 'g1', position, text }, clock),
  parentId: link.id,
})

describe('canNest', () => {
  it('puts links in stacks and notes on links', () => {
    expect(canNest('stack', 'link')).toBe(true)
    expect(canNest('link', 'note')).toBe(true)
    expect(canNest('stack', 'note')).toBe(false)
    expect(canNest('link', 'link')).toBe(false)
    expect(canNest('note', 'note')).toBe(false)
  })
})

describe('pinNotes', () => {
  it('pins several notes in order, after the ones the link has', () => {
    const old = pin('Old', 'a0')
    const a = makeNote({ groupId: 'g2', position: 'a5', text: 'A' }, clock)
    const b = makeNote({ groupId: 'g2', position: 'a6', text: 'B' }, clock)
    const rows = pinNotes([a, b], link, [old], later)
    expect(rows.map((row) => [row.parentId, row.groupId])).toEqual([
      [link.id, 'g1'],
      [link.id, 'g1'],
    ])
    expect(sortByPosition([old, ...rows]).map((row) => row.text)).toEqual(['Old', 'A', 'B'])
  })
})

describe('unpinNotes', () => {
  it('puts notes back into the group right below their link', () => {
    const note = pin('Read later', 'a0')
    const rows = unpinNotes([note], [link, next, note], later)
    expect(rows[0]).toMatchObject({ id: note.id, parentId: null, updatedAt: 2_000 })
    expect(sortByPosition([link, next, rows[0]!]).map((row) => row.id)).toEqual([
      link.id,
      note.id,
      next.id,
    ])
  })

  it('goes below the stack when the link is in one', () => {
    const stack = makeItem({ kind: 'stack', groupId: 'g1', position: p3! }, clock)
    const inStack = { ...link, parentId: stack.id }
    const note = pin('Read later', 'a0')
    const [row] = unpinNotes([note], [next, stack, inStack, note], later)
    expect(sortByPosition([next, stack, row!]).map((item) => item.id)).toEqual([
      next.id,
      stack.id,
      note.id,
    ])
  })
})

describe('detachLinkText', () => {
  it('turns the note on a link into the first pinned note, looking the same', () => {
    const noted = { ...link, text: 'Course page', todo: true, done: true }
    const detached = detachLinkText(noted, [pin('Later one', 'a0')], later)
    expect(detached?.note).toMatchObject({
      kind: 'note',
      parentId: link.id,
      groupId: 'g1',
      text: 'Course page',
      todo: true,
      done: true,
      color: 'sky',
    })
    expect(detached!.note.position < 'a0').toBe(true)
    expect(detached?.rows[1]).toMatchObject({ id: link.id, text: '', todo: false, done: false })
    expect(detachLinkText(link, [], later)).toBeNull()
  })
})
