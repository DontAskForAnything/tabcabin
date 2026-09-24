import { newId } from '@tabhangar/core'
import { asc, eq, sql } from 'drizzle-orm'
import { hashPassword, verifyPassword } from '../auth/password'
import type { Db } from '../db/client'
import { identities, sessions, users } from '../db/schema'
import {
  emailSchema,
  passwordSchema,
  type PublicUser,
  toPublic,
  UserError,
  usernameSchema,
} from './schemas'

/* Accounts with a username and password, managed by the admin CLI or signup. */

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

export function findUser(db: Db, username: string) {
  const parsed = usernameSchema.safeParse(username)
  if (!parsed.success) return undefined
  return db.select().from(users).where(eq(users.username, parsed.data)).get()
}

export function findUserByEmail(db: Db, email: string) {
  return db.select().from(users).where(eq(users.email, email)).get()
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

const DUMMY_HASH =
  'scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=='
