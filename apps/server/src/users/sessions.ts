import { and, eq, gt } from 'drizzle-orm'
import { hashToken, newToken } from '../auth/tokens'
import type { Db } from '../db/client'
import { sessions, users } from '../db/schema'
import { type PublicUser, toPublic } from './schemas'

/* Sign-in sessions: only a hash of each bearer token is stored. */

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
