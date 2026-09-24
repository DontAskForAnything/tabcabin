import { newId } from '@tabhangar/core'
import { and, eq } from 'drizzle-orm'
import type { Db } from '../db/client'
import { identities, users } from '../db/schema'
import { findUser, findUserByEmail } from './accounts'
import { emailSchema, type PublicUser, toPublic } from './schemas'

/* Accounts that sign in with Google. */

/** Whether a new account may be created for this (verified) address. */
export function mayJoin(email: string, rules: { allowSignup: boolean; signupEmails: string[] }) {
  if (rules.allowSignup) return true
  const address = email.toLowerCase()
  const domain = address.slice(address.lastIndexOf('@'))
  return rules.signupEmails.some((entry) => entry === address || entry === domain)
}

/** A free username based on the address, e.g. ola.nowak, ola.nowak-2. */
function usernameFor(db: Db, email: string): string {
  const base =
    email
      .split('@')[0]!
      .toLowerCase()
      .replace(/[^a-z0-9._-]+/g, '.')
      .replace(/^[._-]+|[._-]+$/g, '')
      .slice(0, 56) || 'user'
  const padded = base.length >= 3 ? base : `${base}-user`
  for (let n = 1; ; n++) {
    const candidate = n === 1 ? padded : `${padded}-${n}`
    if (!findUser(db, candidate)) return candidate
  }
}

export type GoogleSignIn =
  | { user: PublicUser; created: boolean }
  | { error: 'not_invited' | 'email_not_verified' | 'too_many_signups' | 'server_full' }

/**
 * The user behind a Google account: a linked one, the user with that address, or, when the
 * address may join, a new account without a password.
 */
export function signInWithGoogle(
  db: Db,
  claims: { sub: string; email: string; emailVerified: boolean },
  rules: { allowSignup: boolean; signupEmails: string[] },
  now = Date.now(),
  /** Why no new account may be created right now (anti-abuse limits), if so. */
  blocked: 'too_many_signups' | 'server_full' | null = null,
): GoogleSignIn {
  const linked = db
    .select({ user: users })
    .from(identities)
    .innerJoin(users, eq(users.id, identities.userId))
    .where(and(eq(identities.provider, 'google'), eq(identities.subject, claims.sub)))
    .get()
  if (linked) return { user: toPublic(linked.user), created: false }
  if (!claims.emailVerified) return { error: 'email_not_verified' }

  const email = emailSchema.parse(claims.email)
  const link = (userId: string) =>
    db
      .insert(identities)
      .values({ provider: 'google', subject: claims.sub, userId, email, createdAt: now })
      .run()
  const existing = findUserByEmail(db, email)
  if (existing) {
    link(existing.id)
    return { user: toPublic(existing), created: false }
  }
  if (!mayJoin(email, rules)) return { error: 'not_invited' }
  if (blocked) return { error: blocked }
  const row = {
    id: newId(),
    username: usernameFor(db, email),
    passwordHash: '',
    email,
    isAdmin: false,
    createdAt: now,
  }
  db.transaction((tx) => {
    tx.insert(users).values(row).run()
    tx.insert(identities)
      .values({ provider: 'google', subject: claims.sub, userId: row.id, email, createdAt: now })
      .run()
  })
  return { user: toPublic(row), created: true }
}
