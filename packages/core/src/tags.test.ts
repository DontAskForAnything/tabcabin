import { describe, expect, it } from 'vitest'
import { makeItem, makeTag } from './factories'
import type { NoteColor } from './schema'
import {
  findTag,
  hasAnyTag,
  mergeTags,
  nextTagColor,
  TAG_LIMITS,
  tagItems,
  tagName,
  tagNamed,
} from './tags'

const clock = { now: Date.UTC(2026, 10, 16, 12) }
const tag = (name: string, color: NoteColor = 'sky', position = 'a0') =>
  makeTag({ name, color, position }, clock)
const item = (tagIds?: string[]) =>
  makeItem({ kind: 'link', groupId: 'g', position: 'a0', url: 'https://a.example', tagIds }, clock)

describe('tag names', () => {
  it('tidies what people type', () => {
    expect(tagName('  #Side   project ')).toBe('Side project')
    expect(tagName('x'.repeat(40))).toHaveLength(TAG_LIMITS.nameLength)
    expect(tagName(' # ')).toBe('')
  })

  it('treats names that differ in case as one tag', () => {
    const work = tag('Work')
    expect(findTag([work], '#work')).toBe(work)
    expect(findTag([work], 'works')).toBeUndefined()
  })
})

describe('making tags', () => {
  it('finds the tag with the name or makes a new one with an unused colour', () => {
    const work = tag('Work', 'rose')
    expect(tagNamed([work], 'WORK', clock)).toEqual({ ok: true, tag: work, created: false })
    const made = tagNamed([work], 'uni', clock)
    expect(made.ok && made.created && made.tag.color).toBe('amber')
    expect(made.ok && made.tag.position > work.position).toBe(true)
    expect(tagNamed([work], '  ', clock)).toEqual({ ok: false, error: 'empty' })
  })

  it('stops at the limit of the account', () => {
    const full = Array.from({ length: TAG_LIMITS.perAccount }, (_, i) => tag(`t${i}`))
    expect(tagNamed(full, 'one more', clock)).toEqual({ ok: false, error: 'full' })
    expect(tagNamed(full, 'T3', clock).ok).toBe(true)
  })

  it('goes round the colours when every one is taken', () => {
    const nine = ['rose', 'amber', 'lime', 'peach', 'pink', 'lilac', 'sky', 'teal', 'sand'].map(
      (color, i) => makeTag({ name: `t${i}`, color: color as NoteColor, position: `a${i}` }, clock),
    )
    expect(nextTagColor(nine)).toBe('rose')
  })
})

describe('tagging items', () => {
  it('adds and removes a tag, dropping tags that are gone', () => {
    const a = item(['gone', 't1'])
    const b = item(['t2'])
    const live = new Set(['t1', 't2'])
    const on = tagItems([a, b], 't2', true, live)
    expect(on.changed.map((c) => c.tagIds)).toEqual([['t1', 't2']])
    const off = tagItems([a, b], 't1', false, live)
    expect(off.changed.map((c) => c.tagIds)).toEqual([[]])
  })

  it('leaves an item that has as many tags as it can', () => {
    const ids = Array.from({ length: TAG_LIMITS.perItem }, (_, i) => `t${i}`)
    const full = item(ids)
    const result = tagItems([full], 'new', true, new Set([...ids, 'new']))
    expect(result.changed).toEqual([])
    expect(result.full).toEqual([full])
  })

  it('matches a stack by the links inside it', () => {
    const wanted = new Set(['t1'])
    expect(hasAnyTag(item(['t1']), wanted)).toBe(true)
    expect(hasAnyTag(item(), wanted, [item(['t2']), item(['t1'])])).toBe(true)
    expect(hasAnyTag(item(['t2']), wanted)).toBe(false)
  })
})

describe('merging imported tags', () => {
  it('reuses names the account has and adds the rest while there is room', () => {
    const mine = tag('Work')
    const theirs = [tag('work', 'lime', 'a0'), tag('Recipes', 'peach', 'a1')]
    const { added, ids } = mergeTags(theirs, [mine], clock)
    expect(ids.get(theirs[0]!.id)).toBe(mine.id)
    expect(added.map((t) => [t.name, t.color])).toEqual([['Recipes', 'peach']])
    expect(ids.get(theirs[1]!.id)).toBe(added[0]!.id)

    const full = Array.from({ length: TAG_LIMITS.perAccount }, (_, i) => tag(`t${i}`))
    expect(mergeTags(theirs, full, clock).ids.size).toBe(0)
  })
})
