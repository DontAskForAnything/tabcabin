import { Dexie } from 'dexie'
import { describe, expect, it } from 'vitest'
import { db } from './db'
import { LEGACY_NAME, moveLegacyDatabase } from './legacy'

function open(name: string) {
  const database = new Dexie(name)
  database.version(1).stores({
    workspaces: 'id, position, deletedAt',
    categories: 'id, workspaceId, deletedAt',
    groups: 'id, categoryId, deletedAt',
    items: 'id, groupId, parentId, url, deletedAt',
    reminders: 'id, itemId, dueAt, deletedAt',
    settings: 'key',
    meta: 'key',
    outbox: '[entity+id], queuedAt',
  })
  return database
}

async function fillLegacy(name: string) {
  const legacy = open(name)
  await legacy
    .table('workspaces')
    .put({ id: 'w1', name: 'Personal', position: 'a0', deletedAt: null })
  await legacy.table('items').bulkPut([
    { id: 'i1', groupId: 'g1', parentId: null, url: 'https://example.com', deletedAt: null },
    { id: 'i2', groupId: 'g1', parentId: null, url: null, deletedAt: null },
  ])
  await legacy.table('settings').put({ key: 'theme', value: 'dark' })
  await legacy.table('meta').put({ key: 'sync.account', value: { token: 't' } })
  await legacy.table('outbox').put({ entity: 'item', id: 'i2', type: 'put', queuedAt: 1 })
  legacy.close()
}

describe('moving the old database', () => {
  it('copies every table and deletes the old database', async () => {
    await fillLegacy('old-1')
    const target = open('new-1')

    expect(await moveLegacyDatabase(target, 'old-1')).toBe(true)

    expect(await target.table('workspaces').toArray()).toHaveLength(1)
    expect(await target.table('items').count()).toBe(2)
    expect(await target.table('settings').get('theme')).toEqual({ key: 'theme', value: 'dark' })
    expect(await target.table('meta').get('sync.account')).toMatchObject({ value: { token: 't' } })
    expect(await target.table('outbox').count()).toBe(1)
    expect(await Dexie.exists('old-1')).toBe(false)
  })

  it('leaves the old database alone when the new one already has boards', async () => {
    await fillLegacy('old-2')
    const target = open('new-2')
    await target.table('workspaces').put({ id: 'w9', name: 'New', position: 'a0', deletedAt: null })

    expect(await moveLegacyDatabase(target, 'old-2')).toBe(false)

    expect(await target.table('workspaces').count()).toBe(1)
    expect(await Dexie.exists('old-2')).toBe(true)
  })

  it('copies only once when two pages open together', async () => {
    await fillLegacy('old-3')
    const first = open('new-3')
    const second = open('new-3')

    const results = await Promise.all([
      moveLegacyDatabase(first, 'old-3'),
      moveLegacyDatabase(second, 'old-3'),
    ])

    expect(results.filter(Boolean)).toHaveLength(1)
    expect(await first.table('items').count()).toBe(2)
  })

  it('does nothing without an old database', async () => {
    expect(await moveLegacyDatabase(open('new-4'), 'missing')).toBe(false)
  })

  it('runs when the app database opens', async () => {
    await fillLegacy(LEGACY_NAME)

    expect(await db.workspaces.toArray()).toMatchObject([{ id: 'w1', name: 'Personal' }])
    expect(await Dexie.exists(LEGACY_NAME)).toBe(false)
  })
})
