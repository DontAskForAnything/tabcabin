import type { EntityType } from '@tabcabin/core'

export interface RemoteChange {
  entity: EntityType
  id: string
  row: Record<string, unknown> | null
  /** Time of the change on the device that made it. */
  updatedAt: number
  seq: number
}

export interface PublicUser {
  id: string
  username: string
  email?: string | null
  isAdmin: boolean
}

interface ServerHealth {
  ok: boolean
  name: string
  version: string
  /** Sign-in options (missing on servers older than Google sign-in). */
  auth?: { password: boolean; google: boolean; signup: boolean }
}

export interface SignedIn {
  token: string
  user: PublicUser
  expiresAt: number
}

export type PushChange =
  | { type: 'put'; entity: EntityType; row: { id: string; updatedAt: number } }
  | { type: 'purge'; entity: EntityType; id: string; at: number }

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    readonly retryAfter?: number,
  ) {
    super(code)
  }
}

type Fetch = typeof fetch

/** Thin client for the TabHangar server API. */
export class SyncClient {
  constructor(
    readonly serverUrl: string,
    private token: string | null = null,
    private readonly fetchImpl: Fetch = (...args) => fetch(...args),
  ) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const headers = new Headers(init.headers)
    if (this.token) headers.set('Authorization', `Bearer ${this.token}`)
    if (init.body) headers.set('Content-Type', 'application/json')
    let res: Response
    try {
      res = await this.fetchImpl(`${this.serverUrl}${path}`, { ...init, headers })
    } catch {
      throw new ApiError(0, 'network')
    }
    if (res.status === 204) return undefined as T
    const body = (await res.json().catch(() => ({}))) as { error?: string; retryAfter?: number }
    if (!res.ok) throw new ApiError(res.status, body.error ?? `http_${res.status}`, body.retryAfter)
    return body as T
  }

  health() {
    return this.request<ServerHealth>('/health')
  }

  async login(username: string, password: string, label: string, signup = false) {
    const result = await this.request<SignedIn>(signup ? '/auth/signup' : '/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password, label }),
    })
    this.token = result.token
    return result
  }

  /** Where the Google sign-in window starts (see apps/server/src/routes/google.ts). */
  googleStartUrl(redirectUri: string, challenge: string, label: string) {
    const params = new URLSearchParams({
      redirect_uri: redirectUri,
      code_challenge: challenge,
      label,
    })
    return `${this.serverUrl}/auth/google/start?${params}`
  }

  /** Trades the one-time code from the sign-in window for a session. */
  async exchangeGoogleCode(code: string, verifier: string) {
    const result = await this.request<SignedIn>('/auth/google/exchange', {
      method: 'POST',
      body: JSON.stringify({ code, verifier }),
    })
    this.token = result.token
    return result
  }

  logout() {
    return this.request<void>('/auth/logout', { method: 'POST' })
  }

  push(changes: PushChange[]) {
    return this.request<{
      accepted: number
      skipped: { entity: EntityType; id: string }[]
      seq: number
    }>('/sync/push', { method: 'POST', body: JSON.stringify({ changes }) })
  }

  pull(since: number, limit = 500) {
    return this.request<{ changes: RemoteChange[]; seq: number; more: boolean }>(
      `/sync/pull?since=${since}&limit=${limit}`,
    )
  }

  /**
   * Reads the server-sent event stream with fetch (so the token stays in a header).
   * Resolves when the stream ends; rejects on errors.
   */
  async events(onEvent: (event: string, data: string) => void, signal: AbortSignal) {
    const res = await this.fetchImpl(`${this.serverUrl}/events`, {
      headers: { Authorization: `Bearer ${this.token}`, Accept: 'text/event-stream' },
      signal,
    })
    if (!res.ok || !res.body)
      throw new ApiError(res.status, res.status === 401 ? 'unauthorized' : 'events')
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) return
      buffer += decoder.decode(value, { stream: true })
      let end: number
      while ((end = buffer.indexOf('\n\n')) >= 0) {
        const block = buffer.slice(0, end)
        buffer = buffer.slice(end + 2)
        let event = 'message'
        const data: string[] = []
        for (const line of block.split('\n')) {
          if (line.startsWith('event:')) event = line.slice(6).trim()
          else if (line.startsWith('data:')) data.push(line.slice(5).trimStart())
        }
        onEvent(event, data.join('\n'))
      }
    }
  }
}
