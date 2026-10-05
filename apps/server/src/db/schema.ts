import { ENTITY_TYPES } from '@tabcabin/core'
import { index, integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core'

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  username: text('username').notNull().unique(),
  /** Empty for accounts that only sign in with Google. */
  passwordHash: text('password_hash').notNull(),
  /** Lets a Google account with this address sign in as this user. */
  email: text('email').unique(),
  isAdmin: integer('is_admin', { mode: 'boolean' }).notNull().default(false),
  createdAt: integer('created_at').notNull(),
})

/** External sign-in accounts linked to a user (Google's stable `sub`). */
export const identities = sqliteTable(
  'identities',
  {
    provider: text('provider', { enum: ['google'] }).notNull(),
    subject: text('subject').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    email: text('email').notNull().default(''),
    createdAt: integer('created_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.provider, t.subject] }), index('identities_user').on(t.userId)],
)

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
