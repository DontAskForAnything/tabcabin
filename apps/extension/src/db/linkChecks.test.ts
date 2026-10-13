import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { dueLinks, nextCheck, recordCheck, RECHECK_AFTER, RETRY_AFTER } from './linkChecks'
import { addLinks, addNote, createGroup, createWorkspace } from './repo'

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
})

describe('link checks', () => {
  it('marks a page gone at once and one that does not answer the second time', () => {
    const url = 'example.com/a'
    expect(nextCheck(undefined, url, { status: 404 }, 1).broken).toBe(true)
    expect(nextCheck(undefined, url, { status: 403 }, 1).broken).toBe(false)
    const once = nextCheck(undefined, url, { status: null }, 1)
    expect(once).toMatchObject({ broken: false, failures: 1 })
    const twice = nextCheck(once, url, { status: 503 }, 2)
    expect(twice).toMatchObject({ broken: true, failures: 2 })
    expect(nextCheck(twice, url, { status: 200 }, 3)).toMatchObject({ broken: false, failures: 0 })
  })

  it('picks web links that are due, the ones never checked first', async () => {
    const ws = await createWorkspace({ name: 'Work', categoryName: 'Today' })
    const { groupId } = await createGroup(ws.categoryId)
    await addLinks(groupId, [
      { url: 'https://example.com/old', title: 'Old' },
      { url: 'https://example.com/new', title: 'New' },
      { url: 'https://example.com/fine', title: 'Fine' },
      { url: 'https://example.com/fine/', title: 'Same page' },
      { url: 'file:///home/notes.txt', title: 'A file' },
    ])
    await addNote(groupId, { text: 'https://example.com/in-a-note' })
    const now = 100 * RECHECK_AFTER
    await recordCheck('https://example.com/old', { status: 200 }, now - RECHECK_AFTER)
    await recordCheck('https://example.com/fine', { status: 200 }, now - RETRY_AFTER)
    expect(await dueLinks(now, 10)).toEqual(['https://example.com/new', 'https://example.com/old'])
    expect(await dueLinks(now, 1)).toEqual(['https://example.com/new'])
  })
})
