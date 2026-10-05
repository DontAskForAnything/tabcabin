import { makeWorkspace } from '@tabcabin/core'
import { createApp } from '@tabcabin/server/src/app'
import { loadConfig } from '@tabcabin/server/src/config'
import { openDatabase } from '@tabcabin/server/src/db/client'
import { migrationsFolder } from '@tabcabin/server/src/paths'
import { createUser } from '@tabcabin/server/src/users'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/db'
import { addLinks, createGroup, createWorkspace, deleteItems, purgeFromBin } from '@/db/repo'
import { SyncClient } from './client'
import { SyncEngine } from './engine'
import { firstSync } from './firstSync'
import { getAccount, getSyncState, setAccount } from './state'

const SERVER = 'https://sync.test'

async function startServer() {
  const { db: serverDb } = openDatabase(':memory:', migrationsFolder())
  const app = createApp({ db: serverDb, config: loadConfig({}) })
  await createUser(serverDb, { username: 'michal', password: 'correct horse' })
  const fetchImpl = ((input: RequestInfo | URL, init?: RequestInit) =>
    app.request(String(input), init)) as typeof fetch
  const signIn = async () => {
    const client = new SyncClient(SERVER, null, fetchImpl)
    const { token, user } = await client.login('michal', 'correct horse', 'test')
    return { client, token, user }
  }
  return { fetchImpl, signIn }
}

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
})

async function connectedEngine() {
  const server = await startServer()
  const { token, user } = await server.signIn()
  const account = { serverUrl: SERVER, token, user, initialized: true }
  await setAccount(account)
  const engine = new SyncEngine(server.fetchImpl)
  return { server, engine, account, other: (await server.signIn()).client }
}

describe('sync engine', () => {
  it('uploads local changes and clears the outbox', async () => {
    const { engine, account, other } = await connectedEngine()
    const ws = await createWorkspace({ name: 'Work', categoryName: 'Today' })
    const group = await createGroup(ws.categoryId, { title: 'Links' })
    await addLinks(group.groupId, [{ url: 'https://a.example', title: 'A' }])
    await engine.setAccount(account)
    expect(await db.outbox.count()).toBe(0)
    const pulled = await other.pull(0)
    expect(pulled.changes.map((c) => c.entity).sort()).toEqual([
      'category',
      'group',
      'item',
      'workspace',
    ])
    expect((await getSyncState()).status).toBe('synced')
    engine.stop()
  })

  it('downloads remote rows without queuing them again', async () => {
    const { engine, account, other } = await connectedEngine()
    const remote = makeWorkspace({ name: 'From laptop', position: 'a0' }, { now: Date.now() })
    await other.push([{ type: 'put', entity: 'workspace', row: remote }])
    await engine.setAccount(account)
    expect((await db.workspaces.get(remote.id))?.name).toBe('From laptop')
    expect(await db.outbox.count()).toBe(0)
    expect((await getSyncState()).lastSeq).toBe(1)
    engine.stop()
  })

  it('keeps a newer local edit over an older remote one', async () => {
    const { engine, account, other } = await connectedEngine()
    const now = Date.now()
    const remote = makeWorkspace({ name: 'Remote', position: 'a0' }, { now: now - 5000 })
    await other.push([{ type: 'put', entity: 'workspace', row: remote }])
    await db.workspaces.put({ ...remote, name: 'Local', updatedAt: now })
    await db.outbox.put({ entity: 'workspace', id: remote.id, type: 'put', queuedAt: now })
    await engine.setAccount(account)
    expect((await db.workspaces.get(remote.id))?.name).toBe('Local')
    const [change] = (await other.pull(0)).changes.filter((c) => c.id === remote.id)
    expect(change?.row).toMatchObject({ name: 'Local' })
    engine.stop()
  })

  it('applies purges from other devices', async () => {
    const { engine, account, other } = await connectedEngine()
    const ws = await createWorkspace({ name: 'Work', categoryName: 'Today' })
    const group = await createGroup(ws.categoryId, { title: 'Links' })
    const { ids } = await addLinks(group.groupId, [{ url: 'https://a.example', title: 'A' }])
    await engine.setAccount(account)
    await other.push([{ type: 'purge', entity: 'item', id: ids[0]!, at: Date.now() + 1000 }])
    await engine.syncNow()
    expect(await db.items.get(ids[0]!)).toBeUndefined()
    engine.stop()
  })

  it('sends local purges as tombstones', async () => {
    const { engine, account, other } = await connectedEngine()
    const ws = await createWorkspace({ name: 'Work', categoryName: 'Today' })
    const group = await createGroup(ws.categoryId, { title: 'Links' })
    const { ids } = await addLinks(group.groupId, [{ url: 'https://a.example', title: 'A' }])
    await engine.setAccount(account)
    await deleteItems(ids)
    await purgeFromBin('item', ids[0]!)
    await engine.syncNow()
    const item = (await other.pull(0)).changes.find((c) => c.id === ids[0])
    expect(item?.row).toBeNull()
    engine.stop()
  })

  it('signs out when the session is no longer valid', async () => {
    const { engine, account } = await connectedEngine()
    await setAccount({ ...account, token: 'expired' })
    await engine.setAccount({ ...account, token: 'expired' })
    expect((await getSyncState()).status).toBe('signed-out')
    expect((await getAccount())?.token).toBe('')
  })
})

describe('first sync', () => {
  it('merges local data with the server', async () => {
    const server = await startServer()
    const { client } = await server.signIn()
    await createWorkspace({ name: 'Local', categoryName: 'Today' })
    await (
      await server.signIn()
    ).client.push([
      {
        type: 'put',
        entity: 'workspace',
        row: makeWorkspace({ name: 'Server', position: 'a5' }, { now: Date.now() }),
      },
    ])
    await firstSync(client, 'merge')
    const names = (await db.workspaces.toArray()).map((w) => w.name).sort()
    expect(names).toEqual(['Local', 'Server'])
  })

  it('replaces local data with the server copy', async () => {
    const server = await startServer()
    const { client } = await server.signIn()
    await createWorkspace({ name: 'Local', categoryName: 'Today' })
    await (
      await server.signIn()
    ).client.push([
      {
        type: 'put',
        entity: 'workspace',
        row: makeWorkspace({ name: 'Server', position: 'a5' }, { now: Date.now() }),
      },
    ])
    await firstSync(client, 'server')
    expect((await db.workspaces.toArray()).map((w) => w.name)).toEqual(['Server'])
    expect(await db.outbox.count()).toBe(0)
  })
})
