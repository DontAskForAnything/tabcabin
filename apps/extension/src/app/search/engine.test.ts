import { describe, expect, it } from 'vitest'
import type { SearchDoc } from '@/db/search'
import { highlightParts, recentDocs, search } from './engine'

const doc = (key: string, title: string, extra: Partial<SearchDoc> = {}): SearchDoc => ({
  key,
  kind: 'link',
  title,
  url: null,
  text: '',
  createdAt: 0,
  path: '',
  ...extra,
})

describe('search engine', () => {
  const docs = [
    doc('a', 'Docker Compose — getting started', { url: 'https://docs.docker.com/compose' }),
    doc('b', 'Hono web framework', { url: 'https://hono.dev' }),
    doc('c', 'Shopping list', { kind: 'note', text: 'milk, bread, docker stickers' }),
  ]

  it('finds by title, url and text with fuzzy matching', () => {
    expect(search(docs, 'docker').map((h) => h.doc.key)).toEqual(expect.arrayContaining(['a', 'c']))
    expect(search(docs, 'hono.dev')[0]!.doc.key).toBe('b')
    expect(search(docs, 'dokcer').map((h) => h.doc.key)).toContain('a')
    expect(search(docs, '   ')).toEqual([])
  })

  it('returns title ranges for highlighting', () => {
    const [hit] = search(docs, 'compose')
    expect(
      highlightParts(hit!.doc.title, hit!.titleRanges)
        .find((p) => p.hit)
        ?.text.toLowerCase(),
    ).toBe('compose')
  })

  it('splits text into highlighted parts', () => {
    expect(highlightParts('Hello world', [[6, 10]])).toEqual([
      { text: 'Hello ', hit: false },
      { text: 'world', hit: true },
    ])
  })

  it('lists the newest documents', () => {
    const recent = recentDocs(
      [doc('x', 'old', { createdAt: 1 }), doc('y', 'new', { createdAt: 5 })],
      1,
    )
    expect(recent.map((d) => d.key)).toEqual(['y'])
  })

  it('finds groups by name but leaves them out of the newest documents', () => {
    const group = doc('g', 'Quarterly planning', { kind: 'group', createdAt: 9 })
    expect(search([group], 'planning')[0]!.doc.key).toBe('g')
    expect(recentDocs([group, doc('y', 'new', { createdAt: 5 })]).map((d) => d.key)).toEqual(['y'])
  })
})
