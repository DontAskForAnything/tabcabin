import { beforeEach, describe, expect, it } from 'vitest'
import { getSettings, setSetting } from '@/settings/settings'
import { db } from './db'
import { loadBoard } from './hooks'
import {
  addLinks,
  addNote,
  combine,
  createCategory,
  createGroup,
  createWorkspace,
  deleteGroup,
  deleteItems,
  deleteWorkspace,
  listBin,
  moveItemsTo,
  purgeFromBin,
  restoreFromBin,
  revert,
  unstackById,
} from './repo'
import { ensureSeed, type SeedText } from './seed'

const seedText: SeedText = {
  workspace: 'Personal',
  categories: ['Today', 'Read later', 'Projects'],
  quickLinks: 'Quick links',
  todo: 'To do',
  welcome: 'Welcome',
  readLater: 'Articles',
  tasks: ['a', 'b', 'c'],
  doneTask: 'done',
  welcomeNote: 'hi',
  tipNote: 'tip',
}

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
})

async function setup() {
  const ws = await createWorkspace({ name: 'Work', categoryName: 'Today' })
  const g1 = await createGroup(ws.categoryId, { title: 'One', emoji: '🌍' })
  const g2 = await createGroup(ws.categoryId, { title: 'Two', emoji: '📥' })
  return { ws, g1: g1.groupId, g2: g2.groupId }
}

const titles = (board: Awaited<ReturnType<typeof loadBoard>>, index: number) =>
  board[index]!.items.map((item) => item.title || item.text)

describe('seed', () => {
  it('creates the starter workspace once', async () => {
    expect(await ensureSeed(seedText)).toBeTypeOf('string')
    expect(await ensureSeed(seedText)).toBeNull()
    expect(await db.workspaces.count()).toBe(1)
    expect(await db.categories.count()).toBe(3)
    const today = (await db.categories.toArray()).find((c) => c.name === 'Today')!
    const board = await loadBoard(today.id)
    expect(board.map((g) => g.title)).toEqual(['Quick links', 'To do', 'Welcome'])
    expect(board[1]!.items[0]!.done).toBe(true)
  })
})

describe('items', () => {
  it('adds links and notes in order', async () => {
    const { ws, g1 } = await setup()
    const { ids } = await addLinks(g1, [
      { url: 'https://a.com', title: 'A' },
      { url: 'https://b.com', title: 'B' },
    ])
    await addNote(g1, { text: 'after A' }, { afterId: ids[0] })
    await addLinks(g1, [{ url: 'https://c.com', title: 'C' }], 0)
    expect(titles(await loadBoard(ws.categoryId), 0)).toEqual(['C', 'A', 'after A', 'B'])
  })

  it('moves items between groups and undoes the move', async () => {
    const { ws, g1, g2 } = await setup()
    const { ids } = await addLinks(g1, [
      { url: 'https://a.com', title: 'A' },
      { url: 'https://b.com', title: 'B' },
    ])
    await addLinks(g2, [{ url: 'https://x.com', title: 'X' }])
    const result = await moveItemsTo([ids[1]!], { groupId: g2, index: 0 })
    let board = await loadBoard(ws.categoryId)
    expect(titles(board, 0)).toEqual(['A'])
    expect(titles(board, 1)).toEqual(['B', 'X'])
    await revert(result)
    board = await loadBoard(ws.categoryId)
    expect(titles(board, 0)).toEqual(['A', 'B'])
  })

  it('stacks links and dissolves the stack', async () => {
    const { ws, g1 } = await setup()
    const { ids } = await addLinks(g1, [
      { url: 'https://a.com', title: 'A' },
      { url: 'https://b.com', title: 'B' },
      { url: 'https://c.com', title: 'C' },
    ])
    const result = await combine([ids[2]!], ids[0]!)
    expect(result.ok).toBe(true)
    let board = await loadBoard(ws.categoryId)
    expect(board[0]!.items.map((i) => i.kind)).toEqual(['stack', 'link'])
    const stack = board[0]!.items[0]!
    expect(stack.children.map((c) => c.title)).toEqual(['A', 'C'])
    await unstackById(stack.id)
    board = await loadBoard(ws.categoryId)
    expect(titles(board, 0)).toEqual(['A', 'C', 'B'])
  })

  it('reports invalid combinations', async () => {
    const { g1 } = await setup()
    const { ids } = await addLinks(g1, [{ url: 'https://a.com', title: 'A' }])
    const note = await addNote(g1, { text: 'n' })
    expect(await combine([ids[0]!], note.id)).toEqual({ ok: false, error: 'note-with-link' })
  })

  it('queues every write in the outbox', async () => {
    const { g1 } = await setup()
    await addLinks(g1, [{ url: 'https://a.com' }])
    const outbox = await db.outbox.toArray()
    expect(outbox.map((o) => o.entity).sort()).toEqual([
      'category',
      'group',
      'group',
      'item',
      'workspace',
    ])
  })
})

describe('bin', () => {
  it('lists a deleted group without its items and restores everything', async () => {
    const { ws, g1 } = await setup()
    await addLinks(g1, [{ url: 'https://a.com', title: 'A' }])
    await deleteGroup(g1)
    const bin = await listBin()
    expect(bin.map((e) => e.entity)).toEqual(['group'])
    expect(bin[0]!.entity === 'group' && bin[0]!.itemCount).toBe(1)
    await restoreFromBin('group', g1, {
      workspaceId: ws.workspaceId,
      categoryId: ws.categoryId,
      restoredGroupTitle: 'Restored items',
    })
    const board = await loadBoard(ws.categoryId)
    expect(titles(board, 0)).toEqual(['A'])
    expect(await listBin()).toEqual([])
  })

  it('restores an item into "Restored items" when its group is gone', async () => {
    const { ws, g1 } = await setup()
    const { ids } = await addLinks(g1, [{ url: 'https://a.com', title: 'A' }])
    await deleteItems(ids)
    await new Promise((r) => setTimeout(r, 2))
    await deleteGroup(g1)
    await restoreFromBin('item', ids[0]!, {
      workspaceId: ws.workspaceId,
      categoryId: ws.categoryId,
      restoredGroupTitle: 'Restored items',
    })
    const board = await loadBoard(ws.categoryId)
    const restored = board.find((g) => g.title === 'Restored items')!
    expect(restored.items.map((i) => i.title)).toEqual(['A'])
  })

  it('purges a deleted workspace with its tree', async () => {
    const { ws, g1 } = await setup()
    await createCategory(ws.workspaceId, 'Later')
    await addLinks(g1, [{ url: 'https://a.com' }])
    await deleteWorkspace(ws.workspaceId)
    expect((await listBin()).map((e) => e.entity)).toEqual(['workspace'])
    await purgeFromBin('workspace', ws.workspaceId)
    expect(await db.workspaces.count()).toBe(0)
    expect(await db.categories.count()).toBe(0)
    expect(await db.groups.count()).toBe(0)
    expect(await db.items.count()).toBe(0)
  })
})

describe('settings', () => {
  it('returns defaults and stored values', async () => {
    expect((await getSettings()).theme).toBe('system')
    await setSetting('theme', 'dark')
    expect((await getSettings()).theme).toBe('dark')
  })
})
