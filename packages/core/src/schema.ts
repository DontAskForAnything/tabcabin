import { z } from 'zod'

export const NOTE_MAX_LENGTH = 5000
export const TITLE_MAX_LENGTH = 300
export const URL_MAX_LENGTH = 4096

export const NOTE_COLORS = [
  'rose',
  'amber',
  'lime',
  'peach',
  'pink',
  'lilac',
  'sky',
  'teal',
  'sand',
] as const
export const noteColorSchema = z.enum(NOTE_COLORS)
export type NoteColor = z.infer<typeof noteColorSchema>

const id = z.string().min(1).max(64)
const timestamp = z.number().int().nonnegative()

const base = {
  id,
  createdAt: timestamp,
  updatedAt: timestamp,
  deletedAt: timestamp.nullable(),
}

export const workspaceSchema = z.object({
  ...base,
  name: z.string().max(80),
  emoji: z.string().max(32),
  position: z.string(),
})
export type Workspace = z.infer<typeof workspaceSchema>

export const categorySchema = z.object({
  ...base,
  workspaceId: id,
  name: z.string().max(80),
  position: z.string(),
})
export type Category = z.infer<typeof categorySchema>

export const groupSchema = z.object({
  ...base,
  categoryId: id,
  title: z.string().max(120),
  emoji: z.string().max(32),
  position: z.string(),
  collapsed: z.boolean(),
  width: z.number().int().min(240).max(1200).nullable(),
})
export type Group = z.infer<typeof groupSchema>

export const ITEM_KINDS = ['link', 'note', 'image', 'stack'] as const
export const itemKindSchema = z.enum(ITEM_KINDS)
export type ItemKind = z.infer<typeof itemKindSchema>

export const itemSchema = z.object({
  ...base,
  groupId: id,
  /** Set when the item lives inside a stack (the stack item's id). */
  parentId: id.nullable(),
  kind: itemKindSchema,
  position: z.string(),
  title: z.string().max(TITLE_MAX_LENGTH),
  url: z.string().max(URL_MAX_LENGTH).nullable(),
  favIconUrl: z.string().max(URL_MAX_LENGTH).nullable(),
  /** Note body, or a comment attached to a link. */
  text: z.string().max(NOTE_MAX_LENGTH),
  color: noteColorSchema.nullable(),
  todo: z.boolean(),
  done: z.boolean(),
  imageUrl: z.string().max(URL_MAX_LENGTH).nullable(),
  metaImageUrl: z.string().max(URL_MAX_LENGTH).nullable(),
  emoji: z.string().max(32).nullable(),
  /** Page a text snippet was clipped from. */
  sourceUrl: z.string().max(URL_MAX_LENGTH).nullable(),
})
export type Item = z.infer<typeof itemSchema>

export const REPEAT_MODES = ['none', 'weekly', 'monthly'] as const
export const reminderSchema = z.object({
  ...base,
  itemId: id,
  dueAt: timestamp,
  repeat: z.enum(REPEAT_MODES),
  /** 0 = Monday … 6 = Sunday, used when repeat === 'weekly'. */
  weekdays: z.array(z.number().int().min(0).max(6)).max(7),
  /** 1-31, used when repeat === 'monthly'. */
  monthDay: z.number().int().min(1).max(31).nullable(),
  /** Local time of repeating reminders in minutes after midnight. */
  timeOfDay: z.number().int().min(0).max(1439),
  /** When the notification for the current `dueAt` was shown. */
  firedAt: timestamp.nullable(),
})
export type Reminder = z.infer<typeof reminderSchema>
export type RepeatMode = Reminder['repeat']

const dayCount = z.number().int().nonnegative()

/** What happened on one computer during one local day. */
export const activityDaySchema = z
  .object({
    /** Tabs with a page that were closed. */
    closed: dayCount,
    /** Links the user saved (imports, templates and the starter board don't count). */
    saved: dayCount,
    /** To-dos ticked off. */
    done: dayCount,
  })
  .loose()
export type ActivityDay = z.infer<typeof activityDaySchema>

/**
 * The week in numbers, one row per computer (its id): each computer only writes its own row, so
 * two of them never overwrite each other's counts, and every computer shows the sum.
 */
export const activitySchema = z.object({
  ...base,
  /** Local days ("2026-10-18") of the last few weeks. */
  days: z.record(z.string().regex(/^\d{4}-\d{2}-\d{2}$/), activityDaySchema),
})
export type Activity = z.infer<typeof activitySchema>

export const ENTITY_TYPES = [
  'workspace',
  'category',
  'group',
  'item',
  'reminder',
  'activity',
] as const
export const entityTypeSchema = z.enum(ENTITY_TYPES)
export type EntityType = z.infer<typeof entityTypeSchema>

export const entitySchemas = {
  workspace: workspaceSchema,
  category: categorySchema,
  group: groupSchema,
  item: itemSchema,
  reminder: reminderSchema,
  activity: activitySchema,
} as const

/** Whether a kind of row named by the server (or another version) is one this version knows. */
export function isEntityType(value: string): value is EntityType {
  return (ENTITY_TYPES as readonly string[]).includes(value)
}

/**
 * Rows as they travel through sync. The known fields are checked as usual, and fields added by a
 * newer version are kept, so an older copy that edits the row hands them back unchanged.
 */
export const syncSchemas = {
  workspace: workspaceSchema.loose(),
  category: categorySchema.loose(),
  group: groupSchema.loose(),
  item: itemSchema.loose(),
  reminder: reminderSchema.loose(),
  activity: activitySchema.loose(),
} as const

export interface EntityMap {
  workspace: Workspace
  category: Category
  group: Group
  item: Item
  reminder: Reminder
  activity: Activity
}

export type AnyEntity = EntityMap[EntityType]
