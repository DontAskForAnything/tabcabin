import { INBOX_ID } from '@tabcabin/core'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { savedElsewhere } from './duplicates'
import { addLinks, createGroup, createWorkspace, deleteItems, ensureInbox } from './repo'

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
})

describe('savedElsewhere', () => {
  it('names the other group a link is saved in, not the target or the bin', async () => {
    const ws = await createWorkspace({ name: 'Work', categoryName: 'Today' })
    const docs = await createGroup(ws.categoryId, { title: 'Docs', emoji: '📚' })
    const target = await createGroup(ws.categoryId, { title: 'Target', emoji: '🎯' })
    const saved = await addLinks(docs.groupId, [
      { url: 'https://example.com/guide/', title: 'Guide' },
      { url: 'https://example.com/old', title: 'Old' },
    ])
    await addLinks(target.groupId, [{ url: 'https://example.com/here', title: 'Here' }])
    await deleteItems([saved.ids[1]!])

    const places = await savedElsewhere(
      ['https://example.com/guide', 'https://example.com/old', 'https://example.com/here'],
      target.groupId,
    )
    expect(places).toEqual([
      {
        url: 'https://example.com/guide',
        itemId: saved.ids[0],
        groupId: docs.groupId,
        label: '📚 Docs',
        categoryId: ws.categoryId,
        workspaceId: ws.workspaceId,
      },
    ])
  })

  it('finds links waiting in the Inbox', async () => {
    await ensureInbox('Inbox')
    await addLinks(INBOX_ID, [{ url: 'https://example.com/later', title: 'Later' }])
    const [place] = await savedElsewhere(['https://example.com/later'], '')
    expect(place).toMatchObject({ groupId: INBOX_ID, label: '📬 Inbox', workspaceId: undefined })
  })
})
