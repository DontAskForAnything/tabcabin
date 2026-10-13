import { makeCategory, makeGroup, makeLink, makeWorkspace, type Workspace } from '@tabcabin/core'
import { describe, expect, it } from 'vitest'
import { createUser } from '../src/users'
import { testApp } from './helpers'

const clock = { now: Date.UTC(2026, 9, 1) }

async function signedIn(username = 'michal') {
  const ctx = testApp()
  return { ...ctx, ...(await login(ctx, username)) }
}

async function login(ctx: ReturnType<typeof testApp>, username: string) {
  await createUser(ctx.db, { username, password: 'correct horse' })
  const res = await ctx.app.request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'correct horse' }),
  })
  const { token } = (await res.json()) as { token: string }
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const push = (changes: unknown[]) =>
    ctx.app.request('/sync/push', { method: 'POST', headers, body: JSON.stringify({ changes }) })
  const pull = async (since = 0, limit?: number) =>
    (await (
      await ctx.app.request(`/sync/pull?since=${since}${limit ? `&limit=${limit}` : ''}`, {
        headers,
      })
    ).json()) as {
      changes: { entity: string; id: string; row: Record<string, unknown> | null; seq: number }[]
      seq: number
      more: boolean
    }
  return { headers, push, pull }
}

const put = (entity: string, row: object) => ({ type: 'put', entity, row })

describe('sync', () => {
  it('pushes rows and pulls them back in order', async () => {
    const { push, pull } = await signedIn()
    const ws = makeWorkspace({ name: 'Work', position: 'a0' }, clock)
    const cat = makeCategory({ workspaceId: ws.id, name: 'Today', position: 'a0' }, clock)
    const group = makeGroup({ categoryId: cat.id, position: 'a0', title: 'Links' }, clock)
    const link = makeLink({ groupId: group.id, position: 'a0', url: 'https://a.example' }, clock)
    const res = await push([
      put('workspace', ws),
      put('category', cat),
      put('group', group),
      put('item', link),
    ])
    expect(await res.json()).toEqual({ accepted: 4, skipped: [], rejected: [], seq: 4 })
    const all = await pull()
    expect(all.changes.map((c) => c.entity)).toEqual(['workspace', 'category', 'group', 'item'])
    expect(all.changes[3]!.row).toMatchObject({ url: 'https://a.example' })
    expect(all.seq).toBe(4)
    expect((await pull(4)).changes).toEqual([])
  })

  it('keeps the newest version of a row (last write wins)', async () => {
    const { push, pull } = await signedIn()
    const ws = makeWorkspace({ name: 'Old', position: 'a0' }, clock)
    const newer: Workspace = { ...ws, name: 'New', updatedAt: ws.updatedAt + 1000 }
    await push([put('workspace', newer)])
    const res = await push([put('workspace', ws)])
    expect(await res.json()).toMatchObject({
      accepted: 0,
      skipped: [{ entity: 'workspace', id: ws.id }],
    })
    const [change] = (await pull()).changes
    expect(change!.row).toMatchObject({ name: 'New' })
  })

  it('turns purges into tombstones', async () => {
    const { push, pull } = await signedIn()
    const ws = makeWorkspace({ name: 'Gone', position: 'a0' }, clock)
    await push([put('workspace', ws)])
    await push([{ type: 'purge', entity: 'workspace', id: ws.id, at: ws.updatedAt + 1 }])
    const { changes } = await pull()
    expect(changes).toEqual([
      { entity: 'workspace', id: ws.id, row: null, updatedAt: ws.updatedAt + 1, seq: 2 },
    ])
  })

  it('rejects invalid rows on their own and keeps users apart', async () => {
    const ctx = testApp()
    const ann = await login(ctx, 'ann')
    const bob = await login(ctx, 'bob')
    const res = await ann.push([
      put('item', { id: 'x', kind: 'nope' }),
      put('workspace', makeWorkspace({ name: 'Ann', position: 'a0' }, clock)),
    ])
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({
      accepted: 1,
      rejected: [{ index: 0, entity: 'item' }],
    })
    expect((await bob.pull()).changes).toEqual([])
    expect((await ann.pull()).changes).toHaveLength(1)
  })

  it('keeps fields from newer versions of the extension', async () => {
    const { push, pull } = await signedIn()
    const ws = makeWorkspace({ name: 'Work', position: 'a0' }, clock)
    await push([put('workspace', { ...ws, color: 'pine' })])
    const [change] = (await pull()).changes
    expect(change!.row).toMatchObject({ name: 'Work', color: 'pine' })
  })

  it('refuses only the changes it does not know or cannot keep', async () => {
    const { push, pull } = await signedIn()
    const ws = makeWorkspace({ name: 'Work', position: 'a0' }, clock)
    const res = await push([
      put('tag', { id: 't1', name: 'Later' }),
      { type: 'purge', entity: 'tag', id: 't1' },
      put('workspace', { ...ws, notes: 'x'.repeat(70_000) }),
      put('workspace', ws),
    ])
    expect(await res.json()).toMatchObject({
      accepted: 1,
      rejected: [
        { index: 0, entity: 'tag', message: 'unknown kind of row' },
        { index: 1, entity: 'tag', message: 'unknown kind of row' },
        { index: 2, entity: 'workspace', message: 'row too large' },
      ],
    })
    expect((await pull()).changes.map((c) => c.id)).toEqual([ws.id])
  })

  it('pages through long histories', async () => {
    const { push, pull } = await signedIn()
    const rows = Array.from({ length: 5 }, (_, i) =>
      put('workspace', makeWorkspace({ name: `W${i}`, position: `a${i}` }, clock)),
    )
    await push(rows)
    const first = await pull(0, 2)
    expect(first).toMatchObject({ seq: 2, more: true })
    const rest = await pull(first.seq, 10)
    expect(rest.changes).toHaveLength(3)
    expect(rest.more).toBe(false)
  })

  it('requires a session', async () => {
    const { app } = testApp()
    expect((await app.request('/sync/pull')).status).toBe(401)
    expect((await app.request('/events')).status).toBe(401)
  })

  it('announces changes on the event stream', async () => {
    const { app, headers, push } = await signedIn()
    const controller = new AbortController()
    const res = await app.request('/events', { headers, signal: controller.signal })
    expect(res.headers.get('content-type')).toMatch(/text\/event-stream/)
    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let text = ''
    const read = async (until: RegExp) => {
      while (!until.test(text)) text += decoder.decode((await reader.read()).value)
    }
    await read(/event: hello/)
    await push([put('workspace', makeWorkspace({ name: 'Live', position: 'a0' }, clock))])
    await read(/event: change\ndata: \{"seq":1\}/)
    controller.abort()
    await reader.cancel().catch(() => undefined)
  })
})
