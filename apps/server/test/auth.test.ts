import { describe, expect, it } from 'vitest'
import { hashPassword, verifyPassword } from '../src/auth/password'
import { RateLimiter } from '../src/auth/rateLimit'
import { runCommand } from '../src/commands'
import { createUser, ensureAdmin, listUsers } from '../src/users'
import { testApp } from './helpers'

const json = (body: unknown, headers: Record<string, string> = {}) => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', ...headers },
  body: JSON.stringify(body),
})

describe('passwords', () => {
  it('verifies the right password only', async () => {
    const hash = await hashPassword('correct horse', { N: 1024, r: 8, p: 1 })
    expect(hash).toMatch(/^scrypt\$1024\$8\$1\$/)
    expect(await verifyPassword('correct horse', hash)).toBe(true)
    expect(await verifyPassword('wrong horse', hash)).toBe(false)
    expect(await verifyPassword('anything', 'garbage')).toBe(false)
  })
})

describe('rate limiter', () => {
  it('blocks after the limit until the window ends', () => {
    const limiter = new RateLimiter(2, 1000)
    limiter.hit('a', 0)
    limiter.hit('a', 10)
    expect(limiter.retryAfter('a', 20)).toBe(1)
    expect(limiter.retryAfter('a', 1001)).toBe(0)
    expect(limiter.retryAfter('b', 20)).toBe(0)
  })
})

describe('auth routes', () => {
  async function withUser() {
    const ctx = testApp()
    await createUser(ctx.db, { username: 'Michal', password: 'correct horse' })
    return ctx
  }

  it('logs in, reads the user and logs out', async () => {
    const { app } = await withUser()
    const login = await app.request(
      '/auth/login',
      json({ username: 'michal', password: 'correct horse', label: 'Chrome' }),
    )
    expect(login.status).toBe(200)
    const { token, user } = (await login.json()) as { token: string; user: { username: string } }
    expect(user.username).toBe('michal')
    const auth = { Authorization: `Bearer ${token}` }
    expect((await app.request('/auth/me', { headers: auth })).status).toBe(200)
    expect((await app.request('/auth/logout', { method: 'POST', headers: auth })).status).toBe(204)
    expect((await app.request('/auth/me', { headers: auth })).status).toBe(401)
  })

  it('rejects wrong passwords, unknown users and missing tokens', async () => {
    const { app } = await withUser()
    const wrong = await app.request(
      '/auth/login',
      json({ username: 'michal', password: 'nope nope' }),
    )
    expect(wrong.status).toBe(401)
    expect(await wrong.json()).toEqual({ error: 'invalid_credentials' })
    const unknown = await app.request(
      '/auth/login',
      json({ username: 'ghost', password: 'whatever1' }),
    )
    expect(unknown.status).toBe(401)
    expect((await app.request('/auth/me')).status).toBe(401)
    expect(
      (await app.request('/auth/me', { headers: { Authorization: 'Bearer nope' } })).status,
    ).toBe(401)
  })

  it('expires sessions after the configured time', async () => {
    let now = Date.UTC(2026, 9, 1)
    const ctx = testApp({ SESSION_TTL_DAYS: '1' }, () => now)
    await createUser(ctx.db, { username: 'michal', password: 'correct horse' })
    const { token } = (await (
      await ctx.app.request('/auth/login', json({ username: 'michal', password: 'correct horse' }))
    ).json()) as { token: string }
    now += 2 * 86_400_000
    const res = await ctx.app.request('/auth/me', { headers: { Authorization: `Bearer ${token}` } })
    expect(res.status).toBe(401)
  })

  it('limits repeated failed logins for an account', async () => {
    const { app } = await withUser()
    for (let i = 0; i < 8; i++)
      await app.request('/auth/login', json({ username: 'michal', password: 'wrong pass' }))
    const blocked = await app.request(
      '/auth/login',
      json({ username: 'michal', password: 'correct horse' }),
    )
    expect(blocked.status).toBe(429)
    expect(Number(blocked.headers.get('retry-after'))).toBeGreaterThan(0)
  })

  it('allows sign-up only when enabled', async () => {
    const closed = testApp()
    const denied = await closed.app.request(
      '/auth/signup',
      json({ username: 'ann', password: 'long enough' }),
    )
    expect(denied.status).toBe(403)
    const open = testApp({ ALLOW_SIGNUP: 'true' })
    const created = await open.app.request(
      '/auth/signup',
      json({ username: 'Ann', password: 'long enough' }),
    )
    expect(created.status).toBe(201)
    const again = await open.app.request(
      '/auth/signup',
      json({ username: 'ann', password: 'long enough' }),
    )
    expect(again.status).toBe(409)
    const short = await open.app.request(
      '/auth/signup',
      json({ username: 'bob', password: 'short' }),
    )
    expect(short.status).toBe(400)
  })
})

describe('accounts', () => {
  it('creates the first admin once', async () => {
    const { db } = testApp()
    const admin = { username: 'owner', password: 'very secret' }
    expect((await ensureAdmin(db, admin))?.isAdmin).toBe(true)
    expect(await ensureAdmin(db, admin)).toBeNull()
    expect(listUsers(db)).toHaveLength(1)
  })

  it('manages users from the command line', async () => {
    const { db, app } = testApp()
    const out: string[] = []
    const io = { readPassword: async () => 'first password', print: (l: string) => out.push(l) }
    expect(await runCommand(db, ['create-user', 'michal', '--admin'], io)).toBe(0)
    expect(await runCommand(db, ['create-user', 'michal'], io)).toBe(1)
    expect(await runCommand(db, ['list-users'], io)).toBe(0)
    const reset = { ...io, readPassword: async () => 'second password' }
    expect(await runCommand(db, ['reset-password', 'michal'], reset)).toBe(0)
    const login = await app.request(
      '/auth/login',
      json({ username: 'michal', password: 'second password' }),
    )
    expect(login.status).toBe(200)
    expect(await runCommand(db, ['delete-user', 'michal'], io)).toBe(0)
    expect(await runCommand(db, ['nonsense'], io)).toBe(2)
    expect(out).toContain('Created michal (admin)')
    expect(out).toContain('michal  (admin)')
  })
})
