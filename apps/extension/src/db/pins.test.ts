import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { loadBoard } from './hooks'
import {
  addLinks,
  addNote,
  addPinnedNote,
  combine,
  createGroup,
  createWorkspace,
  deleteItems,
  detachLinkText,
  listBin,
  moveItemsTo,
  restoreFromBin,
  revert,
  unpinNotes,
  updateItem,
} from './repo'

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
})

async function setup() {
  const ws = await createWorkspace({ name: 'Work', categoryName: 'Today' })
  const g1 = (await createGroup(ws.categoryId, { title: 'One', emoji: '🌍' })).groupId
  const g2 = (await createGroup(ws.categoryId, { title: 'Two', emoji: '📥' })).groupId
  const {
    ids: [link, other],
  } = await addLinks(g1, [{ url: 'https://a.example' }, { url: 'https://b.example' }])
  const a = (await addNote(g1, { text: 'Read chapter 2', todo: true })).id
  const b = (await addNote(g1, { text: 'Slides', color: 'lime' })).id
  return { categoryId: ws.categoryId, g1, g2, link: link!, other: other!, a, b }
}

const shown = async (categoryId: string) =>
  (await loadBoard(categoryId)).map((group) =>
    group.items.map((item) => [item.text || item.url, item.children.map((child) => child.text)]),
  )

describe('notes pinned to a link', () => {
  it('pins several notes, each staying a note of its own, and undoes it', async () => {
    const { categoryId, link, a, b } = await setup()
    const first = await combine([a], link)
    expect(first.ok && first.pinned).toBe(true)
    await combine([b], link)
    expect(await shown(categoryId)).toEqual([
      [
        ['https://a.example', ['Read chapter 2', 'Slides']],
        ['https://b.example', []],
      ],
      [],
    ])
    const pinned = await db.items.get(a)
    expect(pinned).toMatchObject({ kind: 'note', todo: true, parentId: link })
    if (first.ok) await revert(first)
    expect((await db.items.get(a))!.parentId).toBeNull()
  })

  it('takes notes off below their link, and undoes that', async () => {
    const { categoryId, link, a, b } = await setup()
    await combine([a, b], link)
    const result = await unpinNotes([a])
    expect(await shown(categoryId)).toEqual([
      [
        ['https://a.example', ['Slides']],
        ['Read chapter 2', []],
        ['https://b.example', []],
      ],
      [],
    ])
    await revert(result)
    expect((await db.items.get(a))!.parentId).toBe(link)
  })

  it('moves pinned notes within a link, off it, and never links onto it', async () => {
    const { categoryId, g1, link, other, a, b } = await setup()
    await combine([a, b], link)
    await moveItemsTo([b], { groupId: g1, index: 0, parentId: link })
    expect((await shown(categoryId))[0]![0]).toEqual([
      'https://a.example',
      ['Slides', 'Read chapter 2'],
    ])
    await moveItemsTo([other], { groupId: g1, index: 0, parentId: link })
    expect((await db.items.get(other))!.parentId).toBeNull()
    await moveItemsTo([a], { groupId: g1, index: 0 })
    expect((await shown(categoryId))[0]!.map(([text]) => text)).toEqual([
      'Read chapter 2',
      'https://a.example',
      'https://b.example',
    ])
  })

  it('go along with their link to another group and into a stack', async () => {
    const { categoryId, g2, link, other, a } = await setup()
    await combine([a], link)
    await moveItemsTo([link], { groupId: g2, index: 0 })
    expect((await db.items.get(a))!.groupId).toBe(g2)
    // Stacked onto a link in the other group, the note stays pinned and follows.
    await combine([link], other)
    expect((await db.items.get(a))!).toMatchObject({
      parentId: link,
      groupId: (await db.items.get(other))!.groupId,
    })
    const [group] = await loadBoard(categoryId)
    const stack = group!.items.find((item) => item.kind === 'stack')!
    expect(stack.children.map((child) => child.children.map((note) => note.text))).toEqual([
      [],
      ['Read chapter 2'],
    ])
  })

  it('are deleted and restored together with their link', async () => {
    const { categoryId, link, a } = await setup()
    await combine([a], link)
    await deleteItems([link])
    expect((await db.items.get(a))!.deletedAt).not.toBeNull()
    const bin = await listBin()
    expect(bin.map((entry) => entry.row.id)).toEqual([link])
    await restoreFromBin('item', link, {
      workspaceId: '',
      categoryId,
      restoredGroupTitle: 'Restored',
    })
    expect((await shown(categoryId))[0]![0]).toEqual(['https://a.example', ['Read chapter 2']])
  })

  it('adds an empty pinned note at the end', async () => {
    const { categoryId, link, a } = await setup()
    await combine([a], link)
    await addPinnedNote(link)
    expect((await shown(categoryId))[0]![0]).toEqual(['https://a.example', ['Read chapter 2', '']])
  })

  it('turns the note written on a link into the first pinned note', async () => {
    const { categoryId, link, a } = await setup()
    await combine([a], link)
    await updateItem(link, { text: 'From the editor', todo: true })
    const id = await detachLinkText(link)
    expect(await db.items.get(id!)).toMatchObject({
      text: 'From the editor',
      todo: true,
      color: 'sky',
    })
    expect((await shown(categoryId))[0]![0]).toEqual([
      'https://a.example',
      ['From the editor', 'Read chapter 2'],
    ])
    expect(await detachLinkText(link)).toBeNull()
  })

  it('shows a note whose link is gone at the top of its group', async () => {
    const { categoryId, link, a } = await setup()
    await combine([a], link)
    // As an older version would: the link goes, its note stays.
    await db.items.update(link, { deletedAt: Date.now() })
    expect((await shown(categoryId))[0]!.map(([text]) => text)).toContain('Read chapter 2')
  })
})
