import { makeWorkspace } from '@tabcabin/core'
import { beforeEach, describe, expect, it } from 'vitest'
import { db } from '@/db/db'
import { createWorkspace } from '@/db/repo'
import { updateSettings } from '@/settings/settings'
import { ApiError, SyncClient } from './client'
import { SyncEngine } from './engine'
import { signOut } from './signOut'
import { getAccount, getSyncState, setAccount } from './state'
import { SERVER, startServer } from './testServer'

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
})

/** A browser signed in to a fresh server; `offline` makes uploads fail, `slowPull` delays downloads. */
async function signedIn({ offline = false, slowPull = 0 } = {}) {
  const server = await startServer()
  const { token, user } = await server.signIn()
  await setAccount({ serverUrl: SERVER, token, user, initialized: true, via: 'password' })
  const fetchImpl = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input)
    if (offline && url.includes('/sync/push')) throw new TypeError('Failed to fetch')
    if (slowPull && url.includes('/sync/pull'))
      await new Promise((resolve) => setTimeout(resolve, slowPull))
    return server.fetchImpl(input, init)
  }) as typeof fetch
  const engine = new SyncEngine(fetchImpl)
  const other = (await server.signIn()).client
  const session = new SyncClient(SERVER, token, server.fetchImpl)
  return { engine, fetchImpl, other, session }
}

async function sessionEnded(session: SyncClient) {
  const error = await session.pull(0).catch((err: unknown) => err)
  return error instanceof ApiError && error.status === 401
}

describe('signing out', () => {
  it('keeps the boards in this browser and ends the session', async () => {
    const { engine, fetchImpl, session } = await signedIn()
    await createWorkspace({ name: 'Work', categoryName: 'Today' })
    expect(await signOut(engine, { remove: false, force: false }, fetchImpl)).toEqual({ ok: true })
    expect(await getAccount()).toBeNull()
    expect((await getSyncState()).status).toBe('idle')
    expect((await db.workspaces.toArray()).map((ws) => ws.name)).toEqual(['Work'])
    expect(await sessionEnded(session)).toBe(true)
  })

  it('sends the last changes, then removes everything as on a fresh install', async () => {
    const { engine, fetchImpl, other, session } = await signedIn()
    await updateSettings({ theme: 'dark' })
    await db.meta.put({ key: 'onboarding', value: { state: 'done' } })
    await createWorkspace({ name: 'Trip', categoryName: 'Plan' })
    expect(await signOut(engine, { remove: true, force: false }, fetchImpl)).toEqual({ ok: true })
    for (const table of db.tables) expect(await table.count(), table.name).toBe(0)
    expect(await sessionEnded(session)).toBe(true)
    // The account keeps the boards, including the change made just before signing out.
    const names = (await other.pull(0)).changes.map((c) => (c.row as { name?: string })?.name)
    expect(names).toContain('Trip')
  })

  it('removes nothing while changes cannot reach the account, unless told to', async () => {
    const { engine, fetchImpl, session } = await signedIn({ offline: true })
    await createWorkspace({ name: 'Unsent', categoryName: 'Today' })
    const result = await signOut(engine, { remove: true, force: false }, fetchImpl)
    expect(result).toEqual({ ok: false, pending: await db.outbox.count() })
    expect(result.ok || result.pending).toBeGreaterThan(0)
    expect(await getAccount()).not.toBeNull()
    expect(await db.workspaces.count()).toBe(1)
    engine.stop()

    expect(await signOut(engine, { remove: true, force: true }, fetchImpl)).toEqual({ ok: true })
    expect(await db.workspaces.count()).toBe(0)
    expect(await getAccount()).toBeNull()
    expect(await sessionEnded(session)).toBe(true)
  })

  it('waits for a download still running, so nothing comes back after removing', async () => {
    const { engine, fetchImpl, other } = await signedIn({ slowPull: 50 })
    const remote = makeWorkspace({ name: 'From laptop', position: 'a0' }, { now: Date.now() })
    await other.push([{ type: 'put', entity: 'workspace', row: remote }])
    void engine.setAccount((await getAccount())!)
    await new Promise((resolve) => setTimeout(resolve, 10))
    await signOut(engine, { remove: true, force: true }, fetchImpl)
    await new Promise((resolve) => setTimeout(resolve, 150))
    expect(await db.workspaces.count()).toBe(0)
    expect(await db.meta.count()).toBe(0)
  })
})
