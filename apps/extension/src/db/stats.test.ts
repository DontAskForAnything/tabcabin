import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { addLinks, addNote, createGroup, createWorkspace, updateItem } from './repo'
import { ensureSeed } from './seed'
import { countClosedTabs, dayKey, loadWeek } from './stats'

const DAY = 24 * 60 * 60 * 1000

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
})

describe('week stats', () => {
  it('adds up the tabs closed in the last seven days', async () => {
    const now = new Date('2026-10-13T12:00:00').getTime()
    await countClosedTabs(5, now - 8 * DAY)
    await countClosedTabs(3, now - 6 * DAY)
    await countClosedTabs(4, now)
    await countClosedTabs(2, now)
    expect((await loadWeek(now)).closedTabs).toBe(9)
    expect(dayKey(now)).toBe('2026-10-13')
  })

  it('counts saved links and finished to-dos, not the starter board', async () => {
    await ensureSeed({
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
    })
    await new Promise((resolve) => setTimeout(resolve, 5))
    const ws = await createWorkspace({ name: 'Work', categoryName: 'Today' })
    const { groupId } = await createGroup(ws.categoryId)
    await addLinks(groupId, [
      { url: 'https://example.com/a', title: 'A' },
      { url: 'https://example.com/b', title: 'B' },
    ])
    const task = await addNote(groupId, { text: 'Write the report', todo: true })
    await updateItem(task.id, { done: true })
    expect(await loadWeek()).toEqual({ closedTabs: 0, savedLinks: 2, doneTasks: 1 })
  })
})
