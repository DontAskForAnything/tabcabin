import { describe, expect, it } from 'vitest'
import { makeCategory, makeGroup, makeItem, makeReminder, makeWorkspace } from '../factories'
import { sortByPosition } from '../position'
import {
  type Bundle,
  collectBundle,
  createBackup,
  isBackup,
  parseBackup,
  remapBundle,
} from './bundle'
import { toBookmarksHtml, toCsv } from './exporters'
import fixture from './fixtures/tabextend-export.json'
import { importTabExtend, isTabExtendExport } from './tabextend'

const clock = { now: Date.UTC(2026, 9, 7, 12) }

function sample(): Bundle {
  const ws = makeWorkspace({ name: 'Work, "main"', emoji: '💼', position: 'a0' }, clock)
  const other = makeWorkspace({ name: 'Other', position: 'a1' }, clock)
  const cat = makeCategory({ workspaceId: ws.id, name: 'Today', position: 'a0' }, clock)
  const group = makeGroup(
    { categoryId: cat.id, position: 'a0', title: 'Links', emoji: '🔗' },
    clock,
  )
  const link = makeItem(
    { kind: 'link', groupId: group.id, position: 'a0', url: 'https://a.example', title: 'A <b>' },
    clock,
  )
  const note = makeItem(
    { kind: 'note', groupId: group.id, position: 'a1', text: 'line 1\nline "2"', todo: true },
    clock,
  )
  const stack = makeItem({ kind: 'stack', groupId: group.id, position: 'a2' }, clock)
  const child = makeItem(
    {
      kind: 'link',
      groupId: group.id,
      parentId: stack.id,
      position: 'a0',
      url: 'https://c.example',
      title: 'C',
    },
    clock,
  )
  const gone = {
    ...makeItem({ kind: 'note', groupId: group.id, position: 'a3' }, clock),
    deletedAt: 1,
  }
  const reminder = makeReminder({ itemId: link.id, dueAt: clock.now + 1000 }, clock)
  return {
    workspaces: [ws, other],
    categories: [cat],
    groups: [group],
    items: [link, note, stack, child, gone],
    reminders: [reminder],
  }
}

describe('backup', () => {
  it('collects the live tree of a workspace', () => {
    const all = sample()
    const bundle = collectBundle(all, [all.workspaces[0]!.id])
    expect(bundle.workspaces).toHaveLength(1)
    expect(bundle.items).toHaveLength(4)
    expect(bundle.reminders).toHaveLength(1)
  })

  it('round-trips through JSON and gets new ids on import', () => {
    const all = sample()
    const bundle = collectBundle(all, [all.workspaces[0]!.id])
    const file = JSON.parse(JSON.stringify(createBackup(bundle, new Date(clock.now))))
    expect(isBackup(file)).toBe(true)
    const parsed = parseBackup(file)
    const remapped = remapBundle(parsed, { now: clock.now, workspacePositions: ['b0'] })
    expect(remapped.workspaces[0]!.position).toBe('b0')
    expect(remapped.workspaces[0]!.id).not.toBe(bundle.workspaces[0]!.id)
    const stack = remapped.items.find((i) => i.kind === 'stack')!
    const child = remapped.items.find((i) => i.parentId !== null)!
    expect(child.parentId).toBe(stack.id)
    expect(remapped.groups[0]!.categoryId).toBe(remapped.categories[0]!.id)
    expect(remapped.reminders[0]!.itemId).toBe(remapped.items.find((i) => i.title === 'A <b>')!.id)
  })

  it('rejects files that are not backups', () => {
    expect(() => parseBackup({ format: 'tabhangar', version: 1 })).toThrow(/Invalid backup/)
    expect(isBackup([1, 2])).toBe(false)
  })
})

describe('exporters', () => {
  it('writes a bookmarks file with folders and escaped titles', () => {
    const all = sample()
    const html = toBookmarksHtml(collectBundle(all, [all.workspaces[0]!.id]), clock.now)
    expect(html).toContain('<!DOCTYPE NETSCAPE-Bookmark-file-1>')
    expect(html).toContain('<H3 ADD_DATE="1791374400">🔗 Links</H3>')
    expect(html).toContain('>A &lt;b&gt;</A>')
    expect(html).toContain('<H3 ADD_DATE="1791374400">Stack</H3>')
    expect(html).not.toContain('line 1')
  })

  it('writes CSV with quoted cells', () => {
    const all = sample()
    const csv = toCsv(collectBundle(all, [all.workspaces[0]!.id])).split('\r\n')
    expect(csv[0]).toBe('Workspace,Category,Group,Type,Title,URL,Note,Done,Created')
    expect(csv[1]).toMatch(/^"Work, ""main""",Today,Links,link,A <b>,https:\/\/a\.example,,,/)
    expect(csv[2]).toContain('todo,,,"line 1\nline ""2""",false')
    expect(csv[3]).toContain('link,C,https://c.example')
  })
})

describe('tabExtend import', () => {
  const options = {
    now: clock.now,
    position: 'a5',
    workspaceName: 'Imported',
    categoryName: 'Imported',
  }

  it('detects exports', () => {
    expect(isTabExtendExport(fixture)).toBe(true)
    expect(isTabExtendExport(fixture.tabData)).toBe(true)
    expect(isTabExtendExport({ categories: [] })).toBe(false)
  })

  it('maps categories, groups and every item kind', () => {
    const bundle = importTabExtend(fixture, options)
    expect(sortByPosition(bundle.categories).map((c) => c.name)).toEqual(['Work', 'Later'])
    const [docs, read, orphan] = bundle.groups
    expect(docs).toMatchObject({ title: 'Docs', emoji: '📚', width: 480 })
    expect(read).toMatchObject({ collapsed: true, width: null })
    expect(orphan!.categoryId).toBe(sortByPosition(bundle.categories)[0]!.id)
    expect(orphan!.emoji).toBe('📁')

    const items = sortByPosition(bundle.items.filter((i) => i.groupId === docs!.id && !i.parentId))
    expect(items.map((i) => i.kind)).toEqual(['link', 'note', 'stack', 'note', 'image'])
    expect(items[0]).toMatchObject({
      url: 'https://handbook.example.com/start',
      text: 'Read chapter 2 first',
      color: 'amber',
      createdAt: Date.UTC(2026, 9, 6, 8, 15),
    })
    expect(items[1]).toMatchObject({ text: 'Ship the release notes', todo: true, done: true })
    expect(items[3]).toMatchObject({
      title: 'A quote',
      sourceUrl: 'https://blog.example.net/post',
    })
    expect(items[4]).toMatchObject({ imageUrl: 'https://img.example.com/diagram.png' })
    const children = bundle.items.filter((i) => i.parentId === items[2]!.id)
    expect(children.map((c) => c.title)).toEqual(['Spec A', 'Spec B'])
    expect(bundle.items.some((i) => i.url?.startsWith('javascript:'))).toBe(false)
  })

  it('imports old exports without categories', () => {
    const bundle = importTabExtend(fixture.tabData, options)
    expect(bundle.categories.map((c) => c.name)).toEqual(['Imported'])
    expect(bundle.groups).toHaveLength(3)
  })
})
