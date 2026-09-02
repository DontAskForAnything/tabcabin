import { newId } from '@tabhangar/core'
import { and, asc, eq, gt } from 'drizzle-orm'
import { z } from 'zod'
import { hashPassword, verifyPassword } from './auth/password'
import { hashToken, newToken } from './auth/tokens'
import type { Db } from './db/client'
import { sessions, users } from './db/schema'

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(64)
  .regex(/^[a-z0-9._-]+$/, 'use letters, digits, dot, dash or underscore')
export const passwordSchema = z.string().min(8).max(256)

export interface PublicUser {
  id: string
  username: string
  isAdmin: boolean
}

const toPublic = (row: typeof users.$inferSelect): PublicUser => ({
  id: row.id,
  username: row.username,
  isAdmin: row.isAdmin,
})

export class UserError extends Error {
  constructor(
    readonly code: 'username_taken' | 'not_found' | 'invalid',
    message: string,
  ) {
    super(message)
  }
}

export async function createUser(
  db: Db,
  input: { username: string; password: string; isAdmin?: boolean },
  now = Date.now(),
): Promise<PublicUser> {
  const username = usernameSchema.parse(input.username)
  const password = passwordSchema.parse(input.password)
  if (db.select().from(users).where(eq(users.username, username)).get())
    throw new UserError('username_taken', `User ${username} already exists`)
  const row = {
    id: newId(),
    username,
    passwordHash: await hashPassword(password),
    isAdmin: input.isAdmin ?? false,
    createdAt: now,
  }
  db.insert(users).values(row).run()
  return toPublic(row)
}

export function findUser(db: Db, username: string) {
  const parsed = usernameSchema.safeParse(username)
  if (!parsed.success) return undefined
  return db.select().from(users).where(eq(users.username, parsed.data)).get()
}

export function listUsers(db: Db): PublicUser[] {
  return db.select().from(users).orderBy(asc(users.username)).all().map(toPublic)
}

export function countUsers(db: Db): number {
  return db.select().from(users).all().length
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
  // Hash anyway for unknown users so timing does not reveal which usernames exist.
  const ok = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH)
  return user && ok ? toPublic(user) : null
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
