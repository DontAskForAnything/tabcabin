import { makeCategory, makeGroup, makeLink, makeNote, makeWorkspace } from '@tabcabin/core'
import { describe, expect, it } from 'vitest'
import { createUser } from '../src/users'
import { testApp } from './helpers'

const clock = { now: Date.UTC(2026, 9, 1) }

async function signedIn(ctx: ReturnType<typeof testApp>, username: string) {
  await createUser(ctx.db, { username, password: 'correct horse' })
  const res = await ctx.app.request('/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password: 'correct horse' }),
  })
  const { token } = (await res.json()) as { token: string }
  const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }
  const call = (path: string, init: RequestInit = {}) =>
    ctx.app.request(path, { ...init, headers: { ...headers, ...init.headers } })
  return {
    push: (changes: unknown[]) =>
      call('/sync/push', { method: 'POST', body: JSON.stringify({ changes }) }),
    share: (groupId: string) =>
      call('/shares', { method: 'POST', body: JSON.stringify({ groupId }) }),
    call,
  }
}

function board() {
  const ws = makeWorkspace({ name: 'Work', position: 'a0' }, clock)
  const cat = makeCategory({ workspaceId: ws.id, name: 'Today', position: 'a0' }, clock)
  const group = makeGroup(
    { categoryId: cat.id, position: 'a0', title: 'Trip <Lisbon>', emoji: '✈️' },
    clock,
  )
  const link = makeLink(
    { groupId: group.id, position: 'a0', url: 'https://tram28.example/route', title: 'Tram 28' },
    clock,
  )
  const script = makeLink(
    { groupId: group.id, position: 'a1', url: 'javascript:alert(1)', title: 'Not a link' },
    clock,
  )
  const todo = makeNote(
    { groupId: group.id, position: 'a2', text: 'Book <b>tickets</b>', todo: true, done: true },
    clock,
  )
  const pinned = {
    ...makeNote({ groupId: group.id, position: 'a0', text: 'Leaves from Martim Moniz' }, clock),
    parentId: link.id,
  }
  const put = (entity: string, row: object) => ({ type: 'put', entity, row })
  return {
    group,
    link,
    changes: [
      put('workspace', ws),
      put('category', cat),
      put('group', group),
      put('item', link),
      put('item', script),
      put('item', todo),
      put('item', pinned),
    ],
  }
}

describe('shared groups', () => {
  it('shows a group read-only to anyone with the link, safely', async () => {
    const ctx = testApp()
    const me = await signedIn(ctx, 'michal')
    const { group, changes } = board()
    expect((await me.share(group.id)).status).toBe(409)
    await me.push(changes)
    const { share } = (await (await me.share(group.id)).json()) as { share: { id: string } }
    expect(share.id).toMatch(/^[\w-]{22}$/)
    const again = (await (await me.share(group.id)).json()) as { share: { id: string } }
    expect(again.share.id).toBe(share.id)

    const page = await ctx.app.request(`/s/${share.id}`, {
      headers: { 'Accept-Language': 'pl-PL' },
    })
    expect(page.status).toBe(200)
    expect(page.headers.get('x-robots-tag')).toBe('noindex, nofollow')
    expect(page.headers.get('content-security-policy')).toContain("default-src 'none'")
    const html = await page.text()
    expect(html).toContain('<html lang="pl">')
    expect(html).toContain('Trip &lt;Lisbon&gt;')
    expect(html).toContain(
      'href="https://tram28.example/route" rel="noopener noreferrer nofollow ugc"',
    )
    expect(html).not.toContain('javascript:')
    expect(html).toContain('Book &lt;b&gt;tickets&lt;/b&gt;')
    expect(html).toContain('class="todo done"')
    // A note pinned to the link shows under it.
    expect(html).toMatch(/Tram 28.*<div class="pins"><p class="note"[^>]*>Leaves from Martim Moniz/)
    expect(html).toContain('Udostępnione z TabCabin')
  })

  it('stops working when sharing stops, and only the owner can stop it', async () => {
    const ctx = testApp()
    const me = await signedIn(ctx, 'michal')
    const other = await signedIn(ctx, 'ola')
    const { group, changes } = board()
    await me.push(changes)
    const { share } = (await (await me.share(group.id)).json()) as { share: { id: string } }
    expect((await other.call(`/shares/${share.id}`, { method: 'DELETE' })).status).toBe(404)
    expect(await (await other.call(`/shares?groupId=${group.id}`)).json()).toEqual({ share: null })
    expect(await (await me.call(`/shares?groupId=${group.id}`)).json()).toEqual({
      share: { id: share.id, groupId: group.id },
    })
    expect((await me.call(`/shares/${share.id}`, { method: 'DELETE' })).status).toBe(204)
    const gone = await ctx.app.request(`/s/${share.id}`)
    expect(gone.status).toBe(404)
    expect(await gone.text()).toContain('This link no longer works')
  })

  it('follows the group: new items show up, a deleted group ends the link', async () => {
    const ctx = testApp()
    const me = await signedIn(ctx, 'michal')
    const { group, changes } = board()
    await me.push(changes)
    const { share } = (await (await me.share(group.id)).json()) as { share: { id: string } }
    const later = { now: clock.now + 1000 }
    const extra = makeLink(
      { groupId: group.id, position: 'a3', url: 'https://belem.example', title: 'Belém' },
      later,
    )
    await me.push([{ type: 'put', entity: 'item', row: extra }])
    expect(await (await ctx.app.request(`/s/${share.id}`)).text()).toContain('Belém')
    await me.push([
      {
        type: 'put',
        entity: 'group',
        row: { ...group, deletedAt: later.now, updatedAt: later.now },
      },
    ])
    expect((await ctx.app.request(`/s/${share.id}`)).status).toBe(404)
  })
})
