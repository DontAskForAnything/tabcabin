import { randomBytes } from 'node:crypto'
import { and, count, eq, sql } from 'drizzle-orm'
import type { Db } from '../db/client'
import { records, shares } from '../db/schema'

/** A user can share this many groups at once. */
export const MAX_SHARES_PER_USER = 100

export class TooManyShares extends Error {}
/** The group has not reached the server yet (or was deleted). */
export class NotSynced extends Error {}

function liveGroup(db: Db, userId: string, groupId: string) {
  const data = db
    .select({ data: records.data })
    .from(records)
    .where(and(eq(records.userId, userId), eq(records.entity, 'group'), eq(records.id, groupId)))
    .get()?.data
  return data && data.deletedAt === null ? data : null
}

/** The link of a group, made on first use (ids are long and random, so they can't be guessed). */
export function shareGroup(db: Db, userId: string, groupId: string, now: number) {
  const existing = findShare(db, userId, groupId)
  if (existing) return existing
  if (!liveGroup(db, userId, groupId)) throw new NotSynced()
  const [{ total } = { total: 0 }] = db
    .select({ total: count() })
    .from(shares)
    .where(eq(shares.userId, userId))
    .all()
  if (total >= MAX_SHARES_PER_USER) throw new TooManyShares()
  const row = { id: randomBytes(16).toString('base64url'), userId, groupId, createdAt: now }
  db.insert(shares).values(row).run()
  return row
}

export function findShare(db: Db, userId: string, groupId: string) {
  return db
    .select()
    .from(shares)
    .where(and(eq(shares.userId, userId), eq(shares.groupId, groupId)))
    .get()
}

/** Stops sharing; true when the link existed. */
export function unshare(db: Db, userId: string, id: string): boolean {
  return (
    db
      .delete(shares)
      .where(and(eq(shares.id, id), eq(shares.userId, userId)))
      .run().changes > 0
  )
}

export interface SharedItem {
  id: string
  kind: string
  title: string
  url: string | null
  text: string
  color: string | null
  todo: boolean
  done: boolean
  position: string
  parentId: string | null
}

export interface SharedGroup {
  title: string
  emoji: string
  items: SharedItem[]
}

/** The group behind a link as it is now, or null when the link or the group is gone. */
export function loadShared(db: Db, id: string): SharedGroup | null {
  const share = db.select().from(shares).where(eq(shares.id, id)).get()
  if (!share) return null
  const group = liveGroup(db, share.userId, share.groupId)
  if (!group) return null
  const rows = db
    .select({ data: records.data })
    .from(records)
    .where(
      and(
        eq(records.userId, share.userId),
        eq(records.entity, 'item'),
        sql`json_extract(${records.data}, '$.groupId') = ${share.groupId}`,
      ),
    )
    .all()
  const items = rows
    .map((row) => row.data)
    .filter((data): data is Record<string, unknown> => !!data && data.deletedAt === null)
    .map((data): SharedItem => ({
      id: String(data.id),
      kind: String(data.kind),
      title: String(data.title ?? ''),
      url: typeof data.url === 'string' ? data.url : null,
      text: String(data.text ?? ''),
      color: typeof data.color === 'string' ? data.color : null,
      todo: data.todo === true,
      done: data.done === true,
      position: String(data.position ?? ''),
      parentId: typeof data.parentId === 'string' ? data.parentId : null,
    }))
    .sort((a, b) => (a.position < b.position ? -1 : a.position > b.position ? 1 : 0))
  return { title: String(group.title ?? ''), emoji: String(group.emoji ?? ''), items }
}
