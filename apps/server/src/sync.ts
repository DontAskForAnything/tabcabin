import { type EntityType, isEntityType, syncSchemas } from '@tabcabin/core'
import { and, asc, eq, gt, sql } from 'drizzle-orm'
import { z } from 'zod'
import type { Db } from './db/client'
import { meta, records } from './db/schema'

const MAX_BATCH = 1000
/** Rows keep fields from newer versions, so their size is capped (real rows stay far below). */
const MAX_ROW_LENGTH = 64 * 1024

/**
 * The kind of row is checked per change, so one this server does not know (from a newer version)
 * is refused on its own instead of failing the whole batch.
 */
const entityName = z.string().min(1).max(32)

export const pushSchema = z.object({
  changes: z
    .array(
      z.discriminatedUnion('type', [
        z.object({
          type: z.literal('put'),
          entity: entityName,
          row: z.record(z.string(), z.unknown()),
        }),
        z.object({
          type: z.literal('purge'),
          entity: entityName,
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

type StoredRow = Record<string, unknown> & { id: string; updatedAt: number }

type ValidChange =
  | { type: 'put'; entity: EntityType; row: StoredRow }
  | { type: 'purge'; entity: EntityType; id: string; at?: number }

/** A change this server cannot store. The rest of its batch is stored anyway. */
interface RejectedChange {
  index: number
  entity: string
  message: string
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

/** The push would take the account over its storage limit. */
export class QuotaExceeded extends Error {}

/** Checks each change on its own; the ones that fail are reported instead of stored. */
function validate(request: PushRequest) {
  const valid: ValidChange[] = []
  const rejected: RejectedChange[] = []
  for (const [index, change] of request.changes.entries()) {
    const entity = change.entity
    let problem: string | null = null
    if (!isEntityType(entity)) problem = 'unknown kind of row'
    else if (change.type === 'purge') valid.push({ ...change, entity })
    else if (JSON.stringify(change.row).length > MAX_ROW_LENGTH) problem = 'row too large'
    else {
      const parsed = syncSchemas[entity].safeParse(change.row)
      if (parsed.success) valid.push({ type: 'put', entity, row: parsed.data as StoredRow })
      else problem = `${entity}: ${parsed.error.issues[0]?.message ?? 'invalid'}`
    }
    if (problem) rejected.push({ index, entity, message: problem })
  }
  return { valid, rejected }
}

/**
 * Applies a batch of changes for one user. A change wins when its `updatedAt` is not older
 * than the stored one (last write wins per row); older changes are skipped and reported.
 * Rows keep fields this version does not know, and a change it cannot store is rejected alone,
 * so copies of the extension older or newer than the server keep syncing.
 */
export function applyPush(
  db: Db,
  userId: string,
  request: PushRequest,
  now = Date.now(),
  maxRecords = Infinity,
) {
  const { valid, rejected } = validate(request)

  return db.transaction((tx) => {
    const skipped: { entity: EntityType; id: string }[] = []
    const writes: (typeof records.$inferInsert)[] = []
    let added = 0
    for (const change of valid) {
      const id = change.type === 'put' ? change.row.id : change.id
      const updatedAt = change.type === 'put' ? change.row.updatedAt : (change.at ?? now)
      const existing = tx
        .select({ updatedAt: records.updatedAt, live: sql<number>`${records.data} is not null` })
        .from(records)
        .where(
          and(eq(records.userId, userId), eq(records.entity, change.entity), eq(records.id, id)),
        )
        .get()
      if (existing && existing.updatedAt > updatedAt) {
        skipped.push({ entity: change.entity, id })
        continue
      }
      if (change.type === 'put' && !existing?.live) added++
      writes.push({
        userId,
        entity: change.entity,
        id,
        data: change.type === 'put' ? change.row : null,
        updatedAt,
        seq: 0,
      })
    }
    if (added > 0 && Number.isFinite(maxRecords)) {
      const stored =
        tx
          .select({ n: sql<number>`count(*)` })
          .from(records)
          .where(and(eq(records.userId, userId), sql`${records.data} is not null`))
          .get()?.n ?? 0
      if (stored + added > maxRecords) throw new QuotaExceeded()
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
    return {
      accepted: writes.length,
      skipped,
      rejected,
      seq: writes.length ? seq - 1 : currentSeq(tx),
    }
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
