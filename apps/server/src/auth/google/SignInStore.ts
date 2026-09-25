import { hashToken } from '../tokens'

const PENDING_MS = 10 * 60_000
const CODE_MS = 2 * 60_000
const MAX_PENDING = 1000

/** A sign-in on its way through Google, keyed by the OAuth `state`. */
export interface PendingSignIn {
  redirectUri: string
  challenge: string
  label: string
  googleVerifier: string
}

/** A finished sign-in waiting for the extension to redeem its one-time code. */
export interface Grant {
  userId: string
  challenge: string
  label: string
}

/**
 * Pending sign-ins and one-time codes, in memory and short-lived (a restart only means
 * "try again"). Every entry can be taken once.
 */
export class SignInStore {
  private readonly pending = new Map<string, PendingSignIn & { expiresAt: number }>()
  private readonly grants = new Map<string, Grant & { expiresAt: number }>()

  constructor(private readonly now: () => number) {}

  /** False when too many sign-ins are in progress. */
  addPending(state: string, entry: PendingSignIn): boolean {
    this.sweep()
    if (this.pending.size >= MAX_PENDING) return false
    this.pending.set(state, { ...entry, expiresAt: this.now() + PENDING_MS })
    return true
  }

  takePending(state: string): PendingSignIn | null {
    const entry = this.pending.get(state)
    this.pending.delete(state)
    return entry && entry.expiresAt >= this.now() ? entry : null
  }

  /** Only a hash of the code is kept. */
  addGrant(code: string, grant: Grant) {
    this.grants.set(hashToken(code), { ...grant, expiresAt: this.now() + CODE_MS })
  }

  takeGrant(code: string): Grant | null {
    const key = hashToken(code)
    const grant = this.grants.get(key)
    this.grants.delete(key)
    return grant && grant.expiresAt >= this.now() ? grant : null
  }

  private sweep() {
    const t = this.now()
    for (const [key, entry] of this.pending) if (entry.expiresAt < t) this.pending.delete(key)
    for (const [key, entry] of this.grants) if (entry.expiresAt < t) this.grants.delete(key)
  }
}
