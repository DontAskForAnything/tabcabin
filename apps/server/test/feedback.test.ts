import { describe, expect, it } from 'vitest'
import { testApp } from './helpers'

const WEBHOOK = 'https://discord.test/api/webhooks/1/secret'

const send = (body: unknown, ip = '203.0.113.7') => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
  body: JSON.stringify(body),
})

const message = {
  text: 'Moving a group to another workspace needs a shortcut.',
  email: 'ola@example.com',
  version: '1.4.0',
  language: 'pl',
}

/** A stand-in for Discord that keeps what it was sent. */
function discord(status = 204) {
  const posts: { url: string; body: Record<string, unknown> }[] = []
  const fetch = (async (url: string, init: RequestInit) => {
    posts.push({ url, body: JSON.parse(init.body as string) as Record<string, unknown> })
    return new Response(null, { status })
  }) as typeof globalThis.fetch
  return { posts, fetch }
}

function feedbackApp(env: Record<string, string> = {}, status = 204) {
  const stub = discord(status)
  const at = Date.UTC(2026, 9, 19, 12)
  const { app } = testApp(
    { FEEDBACK_WEBHOOK_URL: WEBHOOK, TRUST_PROXY: 'true', ...env },
    () => at,
    { fetch: stub.fetch },
  )
  return { app, posts: stub.posts }
}

describe('feedback', () => {
  it('passes the message on to Discord without pinging anyone', async () => {
    const { app, posts } = feedbackApp()
    const res = await app.request('/feedback', send({ ...message, text: '  @everyone fix it  ' }))
    expect(res.status).toBe(204)
    expect(posts).toHaveLength(1)
    expect(posts[0]!.url).toBe(WEBHOOK)
    expect(posts[0]!.body).toMatchObject({
      allowed_mentions: { parse: [] },
      embeds: [
        {
          description: '@everyone fix it',
          fields: [{ name: 'Reply to', value: 'ola@example.com' }],
          footer: { text: 'TabCabin 1.4.0 · pl' },
          timestamp: '2026-10-19T12:00:00.000Z',
        },
      ],
    })
  })

  it('leaves out the reply address when there is none', async () => {
    const { app, posts } = feedbackApp()
    await app.request('/feedback', send({ ...message, email: '' }))
    expect(posts[0]!.body).toMatchObject({ embeds: [{ fields: [] }] })
  })

  it('says the form is off without a webhook, and the health check tells the extension', async () => {
    const { app } = testApp()
    expect((await app.request('/feedback', send(message))).status).toBe(404)
    expect(await (await app.request('/health')).json()).toMatchObject({ feedback: false })
    const on = feedbackApp().app
    expect(await (await on.request('/health')).json()).toMatchObject({ feedback: true })
  })

  it('turns away empty, too long or odd messages', async () => {
    const { app, posts } = feedbackApp()
    for (const body of [
      { ...message, text: '   ' },
      { ...message, text: 'x'.repeat(2001) },
      { ...message, email: 'not an address' },
      { ...message, version: '<b>' },
      { text: 'Hi' },
    ])
      expect((await app.request('/feedback', send(body))).status).toBe(400)
    expect(posts).toHaveLength(0)
  })

  it('takes only a few messages a day from one network', async () => {
    const { app, posts } = feedbackApp({ FEEDBACK_PER_IP_PER_DAY: '2' })
    expect((await app.request('/feedback', send(message))).status).toBe(204)
    expect((await app.request('/feedback', send(message))).status).toBe(204)
    const third = await app.request('/feedback', send(message))
    expect(third.status).toBe(429)
    expect(await third.json()).toMatchObject({ error: 'too_many_messages' })
    expect((await app.request('/feedback', send(message, '198.51.100.4'))).status).toBe(204)
    expect(posts).toHaveLength(3)
  })

  it('reports when Discord does not take the message', async () => {
    const { app } = feedbackApp({}, 404)
    const res = await app.request('/feedback', send(message))
    expect(res.status).toBe(502)
    expect(await res.json()).toMatchObject({ error: 'feedback_failed' })
  })
})
