import { INBOX_ID } from '@tabcabin/core'
import { beforeEach, describe, expect, it } from 'vitest'
import { buildExport } from '@/data/exportFile'
import { db } from './db'
import { addLinks, createWorkspace, deleteItems, ensureInbox, restoreFromBin } from './repo'
import { loadItemDocs } from './search'

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
})

async function setup() {
  const work = await createWorkspace({ name: 'Work', categoryName: 'Today' })
  await ensureInbox('Inbox')
  const saved = await addLinks(INBOX_ID, [{ url: 'https://example.com/cron', title: 'Cron' }])
  return { work, linkId: saved.ids[0]! }
}

describe('inbox', () => {
  it('is made once, outside every workspace, and synced like any group', async () => {
    await ensureInbox('Inbox')
    await ensureInbox('Skrzynka')
    const inbox = await db.groups.get(INBOX_ID)
    expect(inbox).toMatchObject({ categoryId: INBOX_ID, title: 'Inbox', emoji: '📬' })
    expect(await db.outbox.get(['group', INBOX_ID])).toMatchObject({ type: 'put' })
  })

  it('brings a deleted item back into the Inbox', async () => {
    const { work, linkId } = await setup()
    await deleteItems([linkId])
    await restoreFromBin('item', linkId, {
      workspaceId: work.workspaceId,
      categoryId: work.categoryId,
      restoredGroupTitle: 'Restored',
    })
    expect(await db.items.get(linkId)).toMatchObject({ groupId: INBOX_ID, deletedAt: null })
  })

  it('is searched from every workspace', async () => {
    const { work } = await setup()
    const docs = await loadItemDocs(work.workspaceId)
    expect(docs.map((doc) => [doc.title, doc.path])).toEqual([['Cron', '📬 Inbox']])
  })

  it('goes into a backup of everything as a workspace of its own', async () => {
    const { work } = await setup()
    const all = JSON.parse((await buildExport('json', null, 'Inbox')).content)
    expect(all.workspaces.map((ws: { name: string }) => ws.name)).toEqual(['Work', 'Inbox'])
    const group = all.groups.find((g: { id: string }) => g.id === INBOX_ID)
    const category = all.categories.find((c: { id: string }) => c.id === group.categoryId)
    expect(category.name).toBe('Inbox')
    expect(all.items).toHaveLength(1)

    const one = JSON.parse((await buildExport('json', [work.workspaceId], 'Inbox')).content)
    expect(one.workspaces).toHaveLength(1)
    expect(one.items).toHaveLength(0)
  })
})
