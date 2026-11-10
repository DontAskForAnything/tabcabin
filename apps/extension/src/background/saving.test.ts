import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/db'
import { createGroup, createWorkspace } from '@/db/repo'
import { saveToGroup } from './saving'

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
})

async function group() {
  const ws = await createWorkspace({ name: 'Work', categoryName: 'Today' })
  return (await createGroup(ws.categoryId)).groupId
}

const page = { kind: 'link', url: 'https://example.com/a', title: 'A', favIconUrl: null } as const

describe('saving a page with a note', () => {
  it('pins a to-do to the saved link', async () => {
    const groupId = await group()
    const saved = await saveToGroup(
      { groupId },
      { ...page, note: { text: 'Read the cron section', color: 'lime', todo: true } },
    )
    const link = (await db.items.where({ groupId }).toArray()).find((item) => item.kind === 'link')
    const todo = await db.items.get(saved.itemId!)
    expect(todo).toMatchObject({
      kind: 'note',
      parentId: link?.id,
      text: 'Read the cron section',
      todo: true,
      done: false,
      color: 'lime',
    })
    expect(link).toMatchObject({ parentId: null, text: '' })

    await saved.undo()
    expect((await db.items.toArray()).filter((item) => item.deletedAt === null)).toEqual([])
  })

  it('writes a plain note on the link itself', async () => {
    const groupId = await group()
    const saved = await saveToGroup(
      { groupId },
      { ...page, note: { text: 'Later', color: null, todo: false } },
    )
    expect(await db.items.get(saved.itemId!)).toMatchObject({ kind: 'link', text: 'Later' })
    expect(await db.items.count()).toBe(1)
  })
})
