import { createHash, randomBytes } from 'node:crypto'

/** A random URL-safe secret (state values, verifiers, one-time codes). */
export const randomSecret = (bytes = 32) => randomBytes(bytes).toString('base64url')

/** PKCE S256: the challenge sent ahead for a verifier revealed later. */
export const challengeOf = (verifier: string) =>
  createHash('sha256').update(verifier).digest('base64url')

/** What a PKCE S256 challenge looks like (43 URL-safe characters). */
export const CHALLENGE_PATTERN = /^[A-Za-z0-9_-]{43}$/
