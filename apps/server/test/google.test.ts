import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { runCommand } from '../src/commands'
import { loadConfig } from '../src/config'
import { createUser, listUsers } from '../src/users'
import { testApp } from './helpers'

const EXTENSION = 'https://abcdefghijklmnopabcdefghijklmnop.chromiumapp.org/'
const GOOGLE = {
  PUBLIC_URL: 'https://tabs.example.com',
  GOOGLE_CLIENT_ID: 'client-123.apps.googleusercontent.com',
  GOOGLE_CLIENT_SECRET: 'shh',
}
const verifier = 'v'.repeat(43)
const challenge = (secret: string) => createHash('sha256').update(secret).digest('base64url')

interface Claims {
  sub: string
  email?: string
  email_verified?: boolean
  aud?: string
  iss?: string
}

/** A stand-in for Google's token endpoint: each code maps to the claims of its ID token. */
function fakeGoogle() {
  const codes = new Map<string, Claims>()
  const requests: URLSearchParams[] = []
  const fetch = (async (_url: string, init?: RequestInit) => {
    const body = new URLSearchParams(String(init?.body))
    requests.push(body)
    const claims = codes.get(body.get('code') ?? '')
    if (!claims) return new Response(JSON.stringify({ error: 'invalid_grant' }), { status: 400 })
    const payload = {
      iss: 'https://accounts.google.com',
      aud: GOOGLE.GOOGLE_CLIENT_ID,
      exp: Math.floor(Date.now() / 1000) + 3600,
      ...claims,
    }
    const part = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url')
    return Response.json({ id_token: `${part({ alg: 'RS256' })}.${part(payload)}.signature` })
  }) as typeof globalThis.fetch
  return { codes, requests, fetch }
}

function setup(env: Record<string, string> = {}) {
  const google = fakeGoogle()
  const ctx = testApp({ ...GOOGLE, ...env }, undefined, { fetch: google.fetch })
  /** Runs the browser part of the flow and returns where the window ends up. */
  const signIn = async (claims: Claims, redirect = EXTENSION) => {
    const start = await ctx.app.request(
      `/auth/google/start?${new URLSearchParams({
        redirect_uri: redirect,
        code_challenge: challenge(verifier),
        label: 'Chrome on laptop',
      })}`,
    )
    expect(start.status).toBe(302)
    const toGoogle = new URL(start.headers.get('location')!)
    expect(toGoogle.origin + toGoogle.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth')
    expect(toGoogle.searchParams.get('redirect_uri')).toBe(
      'https://tabs.example.com/auth/google/callback',
    )
    const code = `google-code-${claims.sub}`
    google.codes.set(code, claims)
    const callback = await ctx.app.request(
      `/auth/google/callback?state=${toGoogle.searchParams.get('state')}&code=${code}`,
    )
    expect(callback.status).toBe(302)
    // PKCE towards Google: the verifier sent with the code matches the challenge sent before.
    const sent = google.requests.at(-1)!
    expect(challenge(sent.get('code_verifier')!)).toBe(toGoogle.searchParams.get('code_challenge'))
    expect(sent.get('client_secret')).toBe('shh')
    return new URL(callback.headers.get('location')!)
  }
  const exchange = (code: string, secret = verifier) =>
    ctx.app.request('/auth/google/exchange', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code, verifier: secret }),
    })
  return { ...ctx, google, signIn, exchange }
}

describe('Google sign-in config', () => {
  it('needs both credentials and a public address', () => {
    expect(loadConfig({}).google).toBeNull()
    expect(() => loadConfig({ GOOGLE_CLIENT_ID: 'x' })).toThrow(/both/)
    expect(() => loadConfig({ GOOGLE_CLIENT_ID: 'x', GOOGLE_CLIENT_SECRET: 'y' })).toThrow(
      /PUBLIC_URL/,
    )
    const config = loadConfig({ ...GOOGLE, SIGNUP_EMAILS: 'Ola@Example.com, *@studio.dev' })
    expect(config.google?.issuers).toContain('https://accounts.google.com')
    expect(config.signupEmails).toEqual(['ola@example.com', '@studio.dev'])
  })

  it('is advertised by the health check and off by default', async () => {
    const off = testApp()
    expect(await (await off.app.request('/health')).json()).toMatchObject({
      auth: { password: true, google: false, signup: false },
    })
    expect((await off.app.request('/auth/google/start')).status).toBe(404)
    const on = setup()
    expect(await (await on.app.request('/health')).json()).toMatchObject({
      auth: { google: true },
    })
  })
})

describe('Google sign-in', () => {
  it('turns away addresses that were not invited', async () => {
    const { signIn, db } = setup()
    const back = await signIn({ sub: '1', email: 'stranger@gmail.com', email_verified: true })
    expect(back.origin + back.pathname).toBe(EXTENSION)
    expect(back.searchParams.get('error')).toBe('not_invited')
    expect(listUsers(db)).toHaveLength(0)
  })

  it('creates invited accounts and trades the one-time code for a session', async () => {
    const { signIn, exchange, app, db } = setup({ SIGNUP_EMAILS: '@studio.dev' })
    const back = await signIn({ sub: '42', email: 'Ola.Nowak@studio.dev', email_verified: true })
    const code = back.searchParams.get('code')!
    expect(code).toBeTruthy()

    expect((await exchange(code, 'w'.repeat(43))).status).toBe(400)
    // A wrong verifier burns the code, so sign in again.
    const again = (
      await signIn({ sub: '42', email: 'ola.nowak@studio.dev', email_verified: true })
    ).searchParams.get('code')!
    const res = await exchange(again)
    expect(res.status).toBe(200)
    const body = (await res.json()) as { token: string; user: { username: string; email: string } }
    expect(body.user).toMatchObject({ username: 'ola.nowak', email: 'ola.nowak@studio.dev' })
    const me = await app.request('/auth/me', { headers: { Authorization: `Bearer ${body.token}` } })
    expect(me.status).toBe(200)
    expect((await exchange(again)).status).toBe(400)
    expect(listUsers(db)).toEqual([
      expect.objectContaining({ username: 'ola.nowak', password: false, google: true }),
    ])
  })

  it('links a Google account to the user with that address', async () => {
    const { signIn, exchange, db, app } = setup()
    await createUser(db, { username: 'michal', password: 'correct horse' })
    const out: string[] = []
    const io = { readPassword: async () => '', print: (line: string) => out.push(line) }
    expect(await runCommand(db, ['set-email', 'michal', 'Michal@Gmail.com'], io)).toBe(0)

    const first = await signIn({ sub: '7', email: 'michal@gmail.com', email_verified: true })
    const { user } = (await (await exchange(first.searchParams.get('code')!)).json()) as {
      user: { username: string }
    }
    expect(user.username).toBe('michal')
    // Linked by Google's id from now on, even if the address changes.
    const later = await signIn({ sub: '7', email: 'new@gmail.com', email_verified: true })
    expect(later.searchParams.get('code')).toBeTruthy()
    // The password keeps working.
    const login = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'michal', password: 'correct horse' }),
    })
    expect(login.status).toBe(200)
    expect(await runCommand(db, ['list-users'], io)).toBe(0)
    expect(out).toContain('michal  michal@gmail.com  password+google')
  })

  it('refuses unverified addresses, wrong audiences and cancelled sign-ins', async () => {
    const { signIn, app } = setup({ ALLOW_SIGNUP: 'true' })
    const unverified = await signIn({ sub: '1', email: 'a@b.dev', email_verified: false })
    expect(unverified.searchParams.get('error')).toBe('email_not_verified')
    const foreign = await signIn({ sub: '2', email: 'a@b.dev', email_verified: true, aud: 'other' })
    expect(foreign.searchParams.get('error')).toBe('google_failed')

    const start = await app.request(
      `/auth/google/start?${new URLSearchParams({ redirect_uri: EXTENSION, code_challenge: challenge(verifier) })}`,
    )
    const state = new URL(start.headers.get('location')!).searchParams.get('state')
    const cancelled = await app.request(`/auth/google/callback?state=${state}&error=access_denied`)
    expect(new URL(cancelled.headers.get('location')!).searchParams.get('error')).toBe('cancelled')
    // A state works once.
    expect((await app.request(`/auth/google/callback?state=${state}&code=x`)).status).toBe(400)
  })

  it('only sends sign-ins back to extensions', async () => {
    const { app } = setup({ EXTENSION_IDS: 'abcdefghijklmnopabcdefghijklmnop' })
    const start = (redirect: string, code = challenge(verifier)) =>
      app.request(
        `/auth/google/start?${new URLSearchParams({ redirect_uri: redirect, code_challenge: code })}`,
      )
    expect((await start(EXTENSION)).status).toBe(302)
    expect((await start('https://evil.example.com/')).status).toBe(400)
    expect((await start('https://ppppppppppppppppppppppppppppppppp.chromiumapp.org/')).status).toBe(
      400,
    )
    expect((await start(EXTENSION, 'short')).status).toBe(400)
  })

  it('keeps Google-only accounts out of password login', async () => {
    const { signIn, app } = setup({ ALLOW_SIGNUP: 'true' })
    await signIn({ sub: '9', email: 'only.google@gmail.com', email_verified: true })
    const login = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'only.google', password: '' }),
    })
    expect(login.status).toBe(401)
    const guess = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: 'only.google', password: 'anything at all' }),
    })
    expect(guess.status).toBe(401)
  })
})
