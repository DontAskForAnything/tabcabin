import { makeWorkspace } from '@tabhangar/core'
import { describe, expect, it } from 'vitest'
import { createUser } from '../src/users'
import { testApp } from './helpers'

const json = (body: unknown, headers: Record<string, string> = {}) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
})

const signup = (app: ReturnType<typeof testApp>['app'], username: string) =>
  app.request('/auth/signup', json({ username, password: 'correct horse' }))

describe('anti-abuse limits', () => {
  it('lets one address create only a few accounts a day', async () => {
    const { app } = testApp({ ALLOW_SIGNUP: 'true', SIGNUPS_PER_IP_PER_DAY: '2' })
    expect((await signup(app, 'first')).status).toBe(201)
    expect((await signup(app, 'second')).status).toBe(201)
    const third = await signup(app, 'third')
    expect(third.status).toBe(429)
    expect(await third.json()).toMatchObject({ error: 'too_many_signups' })
  })

  it('stops taking new accounts at MAX_USERS', async () => {
    const { app, db } = testApp({ ALLOW_SIGNUP: 'true', MAX_USERS: '1' })
    await createUser(db, { username: 'michal', password: 'correct horse' })
    const res = await signup(app, 'late')
    expect(res.status).toBe(403)
    expect(await res.json()).toMatchObject({ error: 'server_full' })
  })

  it('caps how many rows one account stores', async () => {
    const { app, db } = testApp({ MAX_RECORDS_PER_USER: '100' })
    await createUser(db, { username: 'michal', password: 'correct horse' })
    const login = await app.request(
      '/auth/login',
      json({ username: 'michal', password: 'correct horse' }),
    )
    const { token } = (await login.json()) as { token: string }
    const push = (rows: object[]) =>
      app.request(
        '/sync/push',
        json(
          { changes: rows.map((row) => ({ type: 'put', entity: 'workspace', row })) },
          { Authorization: `Bearer ${token}` },
        ),
      )
    const clock = { now: Date.UTC(2026, 9, 1) }
    const rows = Array.from({ length: 100 }, (_, i) =>
      makeWorkspace({ name: `W${i}`, position: `a${i}` }, clock),
    )
    expect((await push(rows)).status).toBe(200)
    const over = await push([makeWorkspace({ name: 'One more', position: 'b0' }, clock)])
    expect(over.status).toBe(413)
    expect(await over.json()).toMatchObject({ error: 'quota_exceeded', limit: 100 })
    // Editing what is already stored still works at the limit.
    const edited = { ...rows[0]!, name: 'Renamed', updatedAt: clock.now + 1 }
    expect((await push([edited])).status).toBe(200)
  })
})
