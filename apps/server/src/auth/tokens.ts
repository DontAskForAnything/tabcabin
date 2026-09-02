import { createHash, randomBytes } from 'node:crypto'

/** A new random bearer token (shown to the client once). */
export function newToken(): string {
  return randomBytes(32).toString('base64url')
}

/** Only this hash is stored, so a leaked database does not leak usable tokens. */
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('base64url')
}
