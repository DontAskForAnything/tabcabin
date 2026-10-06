import { describe, expect, it } from 'vitest'
import { loadConfig } from '../src/config'
import { testApp } from './helpers'

describe('config', () => {
  it('uses safe defaults', () => {
    const config = loadConfig({})
    expect(config).toMatchObject({ port: 8787, allowSignup: false, admin: null, publicUrl: null })
    expect(config.sessionTtlMs).toBe(30 * 86_400_000)
  })

  it('parses flags and the first account', () => {
    const config = loadConfig({
      PORT: '3000',
      ALLOW_SIGNUP: 'true',
      PUBLIC_URL: 'https://tabs.example.com/',
      ADMIN_USERNAME: 'michal',
      ADMIN_PASSWORD: 'correct horse',
    })
    expect(config).toMatchObject({
      port: 3000,
      allowSignup: true,
      publicUrl: 'https://tabs.example.com',
      admin: { username: 'michal', password: 'correct horse' },
    })
  })

  it('treats empty variables as not set (as Docker Compose passes them)', () => {
    const config = loadConfig({ ADMIN_USERNAME: '', ADMIN_PASSWORD: '', GOOGLE_CLIENT_ID: '' })
    expect(config.admin).toBeNull()
    expect(config.google).toBeNull()
  })

  it('reports invalid values together', () => {
    expect(() => loadConfig({ PORT: 'abc', PUBLIC_URL: 'nope' })).toThrow(/PORT[\s\S]*PUBLIC_URL/)
    expect(() => loadConfig({ ADMIN_USERNAME: 'only-name' })).toThrow(/both/)
  })
})

describe('app', () => {
  it('answers the health check', async () => {
    const { app } = testApp()
    const res = await app.request('/health')
    expect(res.status).toBe(200)
    expect(await res.json()).toMatchObject({ ok: true, name: 'tabcabin' })
  })

  it('allows extension origins only', async () => {
    const { app } = testApp()
    const ok = await app.request('/health', {
      headers: { Origin: 'chrome-extension://abcdefghijklmnopabcdefghijklmnop' },
    })
    expect(ok.headers.get('access-control-allow-origin')).toBe(
      'chrome-extension://abcdefghijklmnopabcdefghijklmnop',
    )
    const other = await app.request('/health', { headers: { Origin: 'https://evil.example' } })
    expect(other.headers.get('access-control-allow-origin')).toBeNull()
  })

  it('returns JSON for unknown routes', async () => {
    const { app } = testApp()
    const res = await app.request('/nope')
    expect(res.status).toBe(404)
    expect(await res.json()).toEqual({ error: 'not_found' })
  })
})
