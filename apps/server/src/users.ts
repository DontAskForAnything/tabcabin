import { newId } from '@tabhangar/core'
import { and, asc, eq, gt, sql } from 'drizzle-orm'
import { z } from 'zod'
import { hashPassword, verifyPassword } from './auth/password'
import { hashToken, newToken } from './auth/tokens'
import type { Db } from './db/client'
import { identities, sessions, users } from './db/schema'

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9._-]+$/, 'use letters, digits, dot, dash or underscore')
export const passwordSchema = z.string().min(8).max(256)
export const emailSchema = z.email().trim().toLowerCase().max(254)

export interface PublicUser {
  id: string
  username: string
  email: string | null
  isAdmin: boolean
}

const toPublic = (row: typeof users.$inferSelect): PublicUser => ({
  id: row.id,
  username: row.username,
  email: row.email,
  isAdmin: row.isAdmin,
})

export class UserError extends Error {
  constructor(
    readonly code: 'username_taken' | 'email_taken' | 'not_found' | 'invalid',
    message: string,
  ) {
    super(message)
  }
}

export async function createUser(
  db: Db,
  input: { username: string; password: string; email?: string; isAdmin?: boolean },
  now = Date.now(),
): Promise<PublicUser> {
  const username = usernameSchema.parse(input.username)
  const password = passwordSchema.parse(input.password)
  const email = input.email ? emailSchema.parse(input.email) : null
  if (db.select().from(users).where(eq(users.username, username)).get())
    throw new UserError('username_taken', `User ${username} already exists`)
  if (email && findUserByEmail(db, email))
    throw new UserError('email_taken', `Another user already has ${email}`)
  const row = {
    id: newId(),
    username,
    passwordHash: await hashPassword(password),
    email,
    isAdmin: input.isAdmin ?? false,
    createdAt: now,
  }
  db.insert(users).values(row).run()
  return toPublic(row)
}

function findUser(db: Db, username: string) {
  const parsed = usernameSchema.safeParse(username)
  if (!parsed.success) return undefined
  return db.select().from(users).where(eq(users.username, parsed.data)).get()
}

export function getUser(db: Db, id: string): PublicUser | null {
  const row = db.select().from(users).where(eq(users.id, id)).get()
  return row ? toPublic(row) : null
}

export function listUsers(db: Db): (PublicUser & { password: boolean; google: boolean })[] {
  const linked = new Set(
    db
      .select({ userId: identities.userId })
      .from(identities)
      .all()
      .map((row) => row.userId),
  )
  return db
    .select()
    .from(users)
    .orderBy(asc(users.username))
    .all()
    .map((row) => ({
      ...toPublic(row),
      password: row.passwordHash !== '',
      google: linked.has(row.id),
    }))
}

export function countUsers(db: Db): number {
  return (
    db
      .select({ n: sql<number>`count(*)` })
      .from(users)
      .get()?.n ?? 0
  )
}

/** Sets a new password and signs the user out everywhere. */
export async function setPassword(db: Db, username: string, password: string) {
  const user = findUser(db, username)
  if (!user) throw new UserError('not_found', `No user ${username}`)
  const passwordHash = await hashPassword(passwordSchema.parse(password))
  db.transaction((tx) => {
    tx.update(users).set({ passwordHash }).where(eq(users.id, user.id)).run()
    tx.delete(sessions).where(eq(sessions.userId, user.id)).run()
  })
}

/** Sets or clears the address a Google account must have to sign in as this user. */
export function setEmail(db: Db, username: string, email: string | null) {
  const user = findUser(db, username)
  if (!user) throw new UserError('not_found', `No user ${username}`)
  const value = email ? emailSchema.parse(email) : null
  const owner = value ? findUserByEmail(db, value) : undefined
  if (owner && owner.id !== user.id)
    throw new UserError('email_taken', `${owner.username} already has ${value}`)
  db.update(users).set({ email: value }).where(eq(users.id, user.id)).run()
}

export function deleteUser(db: Db, username: string) {
  const user = findUser(db, username)
  if (!user) throw new UserError('not_found', `No user ${username}`)
  db.delete(users).where(eq(users.id, user.id)).run()
}

/** Creates the configured first account when the server has no users yet. */
export async function ensureAdmin(db: Db, admin: { username: string; password: string } | null) {
  if (!admin || countUsers(db) > 0) return null
  return createUser(db, { ...admin, isAdmin: true })
}

export async function checkCredentials(db: Db, username: string, password: string) {
  const user = findUser(db, username)
  // Hash anyway for unknown users (and Google-only accounts) so timing reveals nothing.
  const ok = await verifyPassword(password, user?.passwordHash || DUMMY_HASH)
  return user?.passwordHash && ok ? toPublic(user) : null
}

// ---------- Google accounts ----------

function findUserByEmail(db: Db, email: string) {
  return db.select().from(users).where(eq(users.email, email)).get()
}

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

const DUMMY_HASH =
  'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='

// ---------- sessions ----------

const REFRESH_AFTER_MS = 60 * 60 * 1000

export function createSession(
  db: Db,
  userId: string,
  options: { ttlMs: number; label?: string; now?: number },
) {
  const now = options.now ?? Date.now()
  const token = newToken()
  const expiresAt = now + options.ttlMs
  db.insert(sessions)
    .values({
      tokenHash: hashToken(token),
      userId,
      label: (options.label ?? '').slice(0, 120),
      createdAt: now,
      lastUsedAt: now,
      expiresAt,
    })
    .run()
  return { token, expiresAt }
}

/** The user behind a bearer token; extends the session while it is in use. */
export function resolveSession(
  db: Db,
  token: string,
  options: { ttlMs: number; now?: number },
): { user: PublicUser; tokenHash: string } | null {
  const now = options.now ?? Date.now()
  const tokenHash = hashToken(token)
  const row = db
    .select({ session: sessions, user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.tokenHash, tokenHash), gt(sessions.expiresAt, now)))
    .get()
  if (!row) return null
  if (now - row.session.lastUsedAt > REFRESH_AFTER_MS)
    db.update(sessions)
      .set({ lastUsedAt: now, expiresAt: now + options.ttlMs })
      .where(eq(sessions.tokenHash, tokenHash))
      .run()
  return { user: toPublic(row.user), tokenHash }
}

export function revokeSession(db: Db, tokenHash: string) {
  db.delete(sessions).where(eq(sessions.tokenHash, tokenHash)).run()
}
