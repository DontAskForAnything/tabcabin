import { type EntityType, entitySchemas, ENTITY_TYPES } from '@tabhangar/core'
import { and, asc, eq, gt } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from './db/client'
import { meta, records } from './db/schema'

const MAX_BATCH = 1000

export const pushSchema = z.object({
  changes: z
    .array(
      z.discriminatedUnion('type', [
        z.object({
          type: z.literal('put'),
          entity: z.enum(ENTITY_TYPES),
          row: z.record(z.string(), z.unknown()),
        }),
        z.object({
          type: z.literal('purge'),
          entity: z.enum(ENTITY_TYPES),
          id: z.string().min(1).max(64),
          /** When the client purged it (defaults to now). */
          at: z.number().int().nonnegative().optional(),
        }),
      ]),
    )
    .max(MAX_BATCH),
})
export type PushRequest = z.infer<typeof pushSchema>

interface PulledChange {
  entity: EntityType
  id: string
  /** The latest row, or null when it was purged. */
  row: Record<string, unknown> | null
  updatedAt: number
  seq: number
}

export class InvalidChange extends Error {
  constructor(
    readonly index: number,
    message: string,
  ) {
    super(message)
  }
}

function nextSeq(tx: Pick<Db, 'select' | 'insert'>, count: number): number {
  const current = Number(tx.select().from(meta).where(eq(meta.key, 'seq')).get()?.value ?? 0)
  const last = current + count
  tx.insert(meta)
    .values({ key: 'seq', value: String(last) })
    .onConflictDoUpdate({ target: meta.key, set: { value: String(last) } })
    .run()
  return current + 1
}

/**
 * Applies a batch of changes for one user. A change wins when its `updatedAt` is not older
 * than the stored one (last write wins per row); older changes are skipped and reported.
 */
export function applyPush(db: Db, userId: string, request: PushRequest, now = Date.now()) {
  const validated = request.changes.map((change, index) => {
    if (change.type === 'purge') return change
    const parsed = entitySchemas[change.entity].safeParse(change.row)
    if (!parsed.success)
      throw new InvalidChange(
        index,
        `${change.entity}: ${parsed.error.issues[0]?.message ?? 'invalid'}`,
      )
    return {
      ...change,
      row: parsed.data as Record<string, unknown> & { id: string; updatedAt: number },
    }
  })

  return db.transaction((tx) => {
    const skipped: { entity: EntityType; id: string }[] = []
    const writes: (typeof records.$inferInsert)[] = []
    for (const change of validated) {
      const id = change.type === 'put' ? change.row.id : change.id
      const updatedAt = change.type === 'put' ? change.row.updatedAt : (change.at ?? now)
      const existing = tx
        .select({ updatedAt: records.updatedAt })
        .from(records)
        .where(
          and(eq(records.userId, userId), eq(records.entity, change.entity), eq(records.id, id)),
        )
        .get()
      if (existing && existing.updatedAt > updatedAt) {
        skipped.push({ entity: change.entity, id })
        continue
      }
      writes.push({
        userId,
        entity: change.entity,
        id,
        data: change.type === 'put' ? change.row : null,
        updatedAt,
        seq: 0,
      })
    }
    let seq = writes.length ? nextSeq(tx, writes.length) : currentSeq(tx)
    for (const write of writes) {
      write.seq = seq++
      tx.insert(records)
        .values(write)
        .onConflictDoUpdate({
          target: [records.userId, records.entity, records.id],
          set: { data: write.data, updatedAt: write.updatedAt, seq: write.seq },
        })
        .run()
    }
    return { accepted: writes.length, skipped, seq: writes.length ? seq - 1 : currentSeq(tx) }
  })
}

export function currentSeq(db: Pick<Db, 'select'>): number {
  return Number(db.select().from(meta).where(eq(meta.key, 'seq')).get()?.value ?? 0)
}

/** Changes of one user after `since`, oldest first. */
export function pullChanges(db: Db, userId: string, since: number, limit: number) {
  const rows = db
    .select()
    .from(records)
    .where(and(eq(records.userId, userId), gt(records.seq, since)))
    .orderBy(asc(records.seq))
    .limit(limit + 1)
    .all()
  const page = rows.slice(0, limit)
  const changes: PulledChange[] = page.map((r) => ({
    entity: r.entity,
    id: r.id,
    row: r.data ?? null,
    updatedAt: r.updatedAt,
    seq: r.seq,
  }))
  return {
    changes,
    seq: page.at(-1)?.seq ?? Math.max(since, 0),
    more: rows.length > limit,
  }
}

/** Live notifications: user id → listeners called with the newest seq. */
export class ChangeFeed {
  private listeners = new Map<string, Set<(seq: number) => void>>()

  subscribe(userId: string, listener: (seq: number) => void): () => void {
    const set = this.listeners.get(userId) ?? new Set()
    set.add(listener)
    this.listeners.set(userId, set)
    return () => {
      set.delete(listener)
      if (set.size === 0) this.listeners.delete(userId)
    }
  }

  publish(userId: string, seq: number) {
    for (const listener of this.listeners.get(userId) ?? []) listener(seq)
  }
}
