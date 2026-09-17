import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { sortByPosition } from '../position'
import { isBookmarksHtml, parseBookmarksHtml } from './bookmarksHtml'
import tobyExport from './fixtures/toby-export.json'
import tobyOrganization from './fixtures/toby-organization.json'
import { outlineLinkCount, outlineToBundle } from './outline'
import { isTabExtendExport } from './tabextend'
import { isTobyExport, parseToby } from './toby'
import { isOneTabExport, isUrlList, parseUrlList } from './urlList'

const fixture = (name: string) =>
  readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

const now = Date.UTC(2026, 9, 8, 12)
const options = {
  now,
  position: 'a5',
  workspaceName: 'Imported from Toby',
  workspaceEmoji: '📥',
  categoryName: 'Imported',
  groupName: 'Links',
}

describe('Toby import', () => {
  it('detects Toby exports and nothing else', () => {
    expect(isTobyExport(tobyExport)).toBe(true)
    expect(isTobyExport(tobyOrganization)).toBe(true)
    expect(isTobyExport({ lists: [] })).toBe(false)
    expect(isTabExtendExport(tobyExport)).toBe(false)
  })

  it('maps collections to groups and keeps custom titles, notes and tags', () => {
    const outline = parseToby(tobyExport)
    expect(outline.categories).toHaveLength(1)
    const [reads] = outline.categories[0]!.groups
    expect(reads!.title).toBe('Morning reads')
    expect(reads!.links).toEqual([
      {
        url: 'https://journal.example.dev/calm-software',
        title: 'Calm software',
        note: 'Read the part about notifications',
        createdAt: undefined,
      },
      {
        url: 'https://changelog.example.org/2026',
        title: 'Release notes',
        note: '#work #weekly-review',
        createdAt: undefined,
      },
    ])
  })

  it('turns spaces of an organization export into categories', () => {
    const bundle = outlineToBundle(parseToby(tobyOrganization), options)
    expect(sortByPosition(bundle.categories).map((c) => c.name)).toEqual(['Studio', 'Home'])
    const clients = bundle.groups.find((g) => g.title === 'Clients')!
    const items = sortByPosition(bundle.items.filter((i) => i.groupId === clients.id))
    expect(items.map((i) => i.kind)).toEqual(['note', 'link', 'link'])
    expect(items[0]!.text).toBe('Invoices go out on the 1st')
    expect(items[2]).toMatchObject({ title: 'Shared drive', text: '#docs' })
  })

  it('builds a workspace and skips empty collections', () => {
    const bundle = outlineToBundle(parseToby(tobyExport), options)
    expect(bundle.workspaces[0]).toMatchObject({ name: 'Imported from Toby', emoji: '📥' })
    expect(bundle.categories.map((c) => c.name)).toEqual(['Imported'])
    expect(bundle.groups.map((g) => g.title)).toEqual(['Morning reads'])
    expect(bundle.items).toHaveLength(2)
    expect(bundle.items.every((i) => i.groupId === bundle.groups[0]!.id)).toBe(true)
  })
})

describe('bookmarks HTML import', () => {
  const html = fixture('bookmarks.html')

  it('detects bookmark files', () => {
    expect(isBookmarksHtml(html)).toBe(true)
    expect(isBookmarksHtml('just text https://a.example')).toBe(false)
  })

  it('makes a group per folder with links, under its parent folder', () => {
    const outline = parseBookmarksHtml(html)
    expect(outlineLinkCount(outline)).toBe(3)
    // Links outside folders and the top-level folder share the nameless category.
    expect(outline.categories.map((c) => [c.name, c.groups.map((g) => g.title)])).toEqual([
      ['', ['', 'Research']],
      ['Research', ['Databases']],
    ])
  })

  it('decodes entities and keeps descriptions and dates', () => {
    const research = parseBookmarksHtml(html).categories[0]!.groups[1]!
    expect(research.links[0]).toEqual({
      url: 'https://papers.example.org/local-first?a=1&b=2',
      title: 'Local-first & you',
      note: 'Section 4 has the sync model',
      createdAt: 1_790_000_100_000,
    })
    const databases = parseBookmarksHtml(html).categories[1]!.groups[0]!
    expect(databases.links.map((l) => l.title)).toEqual(['WAL mode – notes'])
  })

  it('names folderless links and nameless categories with the defaults', () => {
    const bundle = outlineToBundle(parseBookmarksHtml(html), options)
    expect(sortByPosition(bundle.categories).map((c) => c.name)).toEqual(['Imported', 'Research'])
    expect(bundle.groups.map((g) => g.title)).toEqual(['Links', 'Research', 'Databases'])
    const start = bundle.items.find((i) => i.url === 'https://start.example.com/')!
    expect(start.createdAt).toBe(1_790_000_000_000)
  })
})

describe('URL list import', () => {
  it('reads OneTab exports: one group per paragraph, titles after the bar', () => {
    const text = fixture('onetab.txt')
    expect(isUrlList(text)).toBe(true)
    expect(isOneTabExport(text)).toBe(true)
    const [category] = parseUrlList(text).categories
    expect(category!.groups.map((g) => g.links.map((l) => l.title))).toEqual([
      ['Getting started guide', 'API reference'],
      ['Cart'],
    ])
  })

  it('reads plain lists, headings and Markdown links', () => {
    const text = [
      '# Reading',
      'https://a.example.com/one',
      'A title - https://a.example.com/two.',
      '[Docs](https://docs.example.com)',
      'some note without a link',
      '',
      'https://b.example.com',
    ].join('\n')
    expect(isOneTabExport(text)).toBe(false)
    const groups = parseUrlList(text).categories[0]!.groups
    expect(groups.map((g) => g.title)).toEqual(['Reading', ''])
    expect(groups[0]!.links).toEqual([
      { url: 'https://a.example.com/one', title: 'https://a.example.com/one' },
      { url: 'https://a.example.com/two', title: 'A title' },
      { url: 'https://docs.example.com', title: 'Docs' },
    ])
  })

  it('rejects text that is mostly not links', () => {
    expect(isUrlList('Dear diary\nToday was long\nhttps://a.example.com\nThe end')).toBe(false)
    expect(isUrlList('')).toBe(false)
  })
})
