import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import tobyExport from './fixtures/toby-export.json'
import { outlineToBookmarksHtml } from './outlineBookmarks'
import { parseToby } from './toby'
import { parseUrlList } from './urlList'

const now = Date.UTC(2026, 9, 20, 12)
const options = { folder: 'OneTab', groupName: 'Group', now }
const folders = (html: string) => [...html.matchAll(/<H3[^>]*>([^<]*)<\/H3>/g)].map((m) => m[1])
const links = (html: string) => [...html.matchAll(/<A HREF="([^"]*)"[^>]*>([^<]*)<\/A>/g)]

describe('outline as a bookmarks file', () => {
  it('puts each OneTab list in a numbered folder', () => {
    const text = readFileSync(new URL('./fixtures/onetab.txt', import.meta.url), 'utf8')
    const html = outlineToBookmarksHtml(parseUrlList(text), options)
    expect(html.startsWith('<!DOCTYPE NETSCAPE-Bookmark-file-1>')).toBe(true)
    expect(folders(html)).toEqual(['OneTab', 'Group 1', 'Group 2'])
    expect(links(html)[0]!.slice(1)).toEqual([
      'https://docs.example.com/guide',
      'Getting started guide',
    ])
    expect(html).toContain(`ADD_DATE="${now / 1000}"`)
  })

  it('puts a single list straight into the folder', () => {
    const outline = parseUrlList('https://a.example.com/ | A\nhttps://b.example.com/ | B\n')
    const html = outlineToBookmarksHtml(outline, { ...options, folder: '  ' })
    expect(folders(html)).toEqual(['Group'])
    expect(links(html)).toHaveLength(2)
  })

  it('keeps Toby collection names and dates', () => {
    const html = outlineToBookmarksHtml(parseToby(tobyExport), { ...options, folder: 'Toby' })
    expect(folders(html)).toContain('Morning reads')
    expect(folders(html)).not.toContain('Group 1')
    expect(links(html).length).toBeGreaterThan(1)
  })

  it('makes a folder per space when there are several', () => {
    const html = outlineToBookmarksHtml(
      {
        categories: [
          { name: 'Work', groups: [{ title: 'Docs', links: [{ url: 'https://w.example.com/' }] }] },
          { name: '', groups: [{ title: '', links: [{ url: 'https://h.example.com/' }] }] },
        ],
      },
      options,
    )
    expect(folders(html)).toEqual(['OneTab', 'Work', 'Docs', 'Group', 'Group'])
  })

  it('escapes text and drops addresses a browser should not open', () => {
    const html = outlineToBookmarksHtml(
      {
        categories: [
          {
            name: '',
            groups: [
              {
                title: 'Tom & <Jerry>',
                links: [
                  { url: 'javascript:alert(1)', title: 'Bad' },
                  { url: 'https://x.example.com/?a=1&b="2"', title: '<b>bold</b>' },
                ],
              },
              { title: 'Empty', links: [{ url: 'data:text/html,hi' }] },
            ],
          },
        ],
      },
      options,
    )
    expect(html).not.toContain('javascript:')
    expect(html).not.toContain('Empty')
    expect(html).toContain('https://x.example.com/?a=1&amp;b=&quot;2&quot;')
    expect(html).toContain('&lt;b&gt;bold&lt;/b&gt;')
  })
})
