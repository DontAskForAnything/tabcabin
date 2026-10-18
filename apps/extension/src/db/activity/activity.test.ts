import { Dexie } from 'dexie'
import { beforeEach, describe, expect, it } from 'vitest'
import { saveToGroup } from '@/background/saving'
import { db, TabCabinDB } from '../db'
import {
  addLinks,
  addNote,
  createGroup,
  createWorkspace,
  deleteItems,
  moveItemsTo,
  updateItem,
} from '../repo'
import { countActivity } from './count'
import { DAY, dayKey } from './days'
import { DEVICE_KEY, ownDeviceId } from './device'
import { loadWeek } from './week'

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
})

const now = new Date('2026-10-13T12:00:00').getTime()

async function group() {
  const ws = await createWorkspace({ name: 'Work', categoryName: 'Today' })
  return (await createGroup(ws.categoryId)).groupId
}

describe('week activity', () => {
  it('adds up the last seven days and keeps eight weeks', async () => {
    await countActivity({ closed: 5 }, now - 60 * DAY)
    await countActivity({ closed: 5 }, now - 8 * DAY)
    await countActivity({ closed: 3, saved: 1 }, now - 6 * DAY)
    await countActivity({ closed: 4, done: 2 }, now)
    await countActivity({ closed: 2 }, now)
    expect(await loadWeek(now)).toEqual({ closedTabs: 9, savedLinks: 1, doneTasks: 2 })
    const row = (await db.activity.toArray())[0]!
    expect(Object.keys(row.days).sort()).toEqual([
      dayKey(now - 8 * DAY),
      dayKey(now - 6 * DAY),
      dayKey(now),
    ])
    // Every count is queued for sync, as the browser's own row.
    expect(await db.outbox.get(['activity', row.id])).toBeTruthy()
    expect(row.id).toBe(await ownDeviceId())
  })

  it('takes back an undone step, never below zero', async () => {
    await countActivity({ saved: 2 }, now)
    await countActivity({ saved: -1 }, now)
    await countActivity({ done: -1 }, now)
    expect(await loadWeek(now)).toEqual({ closedTabs: 0, savedLinks: 1, doneTasks: 0 })
  })

  it('adds other computers of the account only when asked to', async () => {
    await countActivity({ closed: 2 }, now)
    const day = { [dayKey(now)]: { closed: 7, saved: 3, done: 1 } }
    await db.activity.put({
      id: 'work',
      createdAt: now,
      updatedAt: now,
      deletedAt: null,
      days: day,
    })
    expect((await loadWeek(now)).closedTabs).toBe(2)
    expect(await loadWeek(now, true)).toEqual({ closedTabs: 9, savedLinks: 3, doneTasks: 1 })
  })

  it('counts a ticked to-do once; moving, editing or deleting it changes nothing', async () => {
    const groupId = await group()
    const task = await addNote(groupId, { text: 'Write the report', todo: true })
    await updateItem(task.id, { done: true })
    await updateItem(task.id, { text: 'Write the whole report' })
    await moveItemsTo([task.id], { groupId, index: 0 })
    await deleteItems([task.id])
    expect((await loadWeek()).doneTasks).toBe(1)
    const other = await addNote(groupId, { text: 'Call Ola', todo: true })
    await updateItem(other.id, { done: true })
    await updateItem(other.id, { done: false })
    // Turning a finished to-do back into a plain note is not unticking it.
    const third = await addNote(groupId, { text: 'Pack', todo: true, done: true })
    await updateItem(third.id, { todo: false, done: false })
    expect((await loadWeek()).doneTasks).toBe(1)
  })

  it('counts links the user saves, not links added by imports or templates', async () => {
    const groupId = await group()
    await addLinks(groupId, [{ url: 'https://example.com/import', title: 'Imported' }])
    const saved = await saveToGroup(
      { groupId },
      { kind: 'link', url: 'https://example.com/a', title: 'A', favIconUrl: null },
    )
    expect((await loadWeek()).savedLinks).toBe(1)
    await saved.undo()
    expect((await loadWeek()).savedLinks).toBe(0)
    expect(await db.items.filter((item) => item.url === 'https://example.com/a').count()).toBe(0)
  })
})

describe('upgrading', () => {
  it('moves the closed tabs counted before into this browser’s row', async () => {
    const name = 'tabcabin-upgrade-test'
    await Dexie.delete(name)
    const old = new Dexie(name)
    old.version(2).stores({
      workspaces: 'id, position, deletedAt',
      categories: 'id, workspaceId, deletedAt',
      groups: 'id, categoryId, deletedAt',
      items: 'id, groupId, parentId, url, deletedAt',
      reminders: 'id, itemId, dueAt, deletedAt',
      settings: 'key',
      meta: 'key',
      outbox: '[entity+id], queuedAt',
      linkChecks: 'url, checkedAt',
    })
    await old.table('meta').put({ key: 'stats.closedTabs', value: { '2026-10-12': 4 } })
    old.close()

    const upgraded = new TabCabinDB(name)
    await upgraded.open()
    const id = (await upgraded.meta.get(DEVICE_KEY))?.value as string
    expect(await upgraded.activity.get(id)).toMatchObject({
      days: { '2026-10-12': { closed: 4, saved: 0, done: 0 } },
    })
    expect(await upgraded.outbox.get(['activity', id])).toBeTruthy()
    expect(await upgraded.meta.get('stats.closedTabs')).toBeUndefined()
    upgraded.close()
    await Dexie.delete(name)
  })
})
