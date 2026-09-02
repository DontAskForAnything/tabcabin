import { ENTITY_TYPES } from '@tabhangar/core'
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
})

/** Login sessions; only a hash of the bearer token is stored. */
export const sessions = sqliteTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    label: text('label').notNull().default(''),
    createdAt: integer('created_at').notNull(),
    lastUsedAt: integer('last_used_at').notNull(),
    expiresAt: integer('expires_at').notNull(),
  },
  (t) => [index('sessions_user').on(t.userId)],
)

/**
 * The latest version of every synced row (workspaces, categories, groups, items, reminders).
 * `seq` grows with every write, so clients pull "everything after the seq I have seen".
 * Purged rows stay as tombstones (`data` = null) so other devices learn about them.
 */
export const records = sqliteTable(
  'records',
  {
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    entity: text('entity', { enum: ENTITY_TYPES }).notNull(),
    id: text('id').notNull(),
    data: text('data', { mode: 'json' }).$type<Record<string, unknown> | null>(),
    updatedAt: integer('updated_at').notNull(),
    seq: integer('seq').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.userId, t.entity, t.id] }),
    index('records_user_seq').on(t.userId, t.seq),
  ],
)

/** Small key/value table (the global change counter). */
export const meta = sqliteTable('meta', {
  key: text('key').primaryKey(),
  value: text('value').notNull(),
})
