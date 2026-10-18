import { describe, expect, it } from 'vitest'
import { type EntityType, entitySchemas, syncSchemas } from './schema'

/**
 * Rows exactly as TabCabin 1.2 writes and syncs them. Copies of the extension that are not
 * updated yet keep sending these, so every later version must still accept them: new fields
 * have to be optional, and fields or values must not be renamed or removed.
 */
const at = Date.UTC(2026, 9, 1)
const rowsFrom1_2: Record<Exclude<EntityType, 'activity'>, Record<string, unknown>> = {
  workspace: {
    id: 'w1',
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
    name: 'Work',
    emoji: '💼',
    position: 'a0',
  },
  category: {
    id: 'c1',
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
    workspaceId: 'w1',
    name: 'Today',
    position: 'a0',
  },
  group: {
    id: 'g1',
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
    categoryId: 'c1',
    title: 'Reading',
    emoji: '📚',
    position: 'a0',
    collapsed: false,
    width: null,
  },
  item: {
    id: 'i1',
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
    groupId: 'g1',
    parentId: null,
    kind: 'link',
    position: 'a0',
    title: 'Example',
    url: 'https://example.com',
    favIconUrl: null,
    text: '',
    color: null,
    todo: false,
    done: false,
    imageUrl: null,
    metaImageUrl: null,
    emoji: null,
    sourceUrl: null,
  },
  reminder: {
    id: 'r1',
    createdAt: at,
    updatedAt: at,
    deletedAt: null,
    itemId: 'i1',
    dueAt: at,
    repeat: 'weekly',
    weekdays: [0, 4],
    monthDay: null,
    timeOfDay: 540,
    firedAt: null,
  },
}

/** A computer's week as the first version with activity rows writes it. */
const firstActivity = {
  id: 'd1',
  createdAt: at,
  updatedAt: at,
  deletedAt: null,
  days: { '2026-10-18': { closed: 3, saved: 1, done: 2 } },
}

describe('rows from older versions', () => {
  it.each(Object.entries(rowsFrom1_2))('accepts a %s from TabCabin 1.2', (entity, row) => {
    expect(entitySchemas[entity as EntityType].safeParse(row).success).toBe(true)
    expect(syncSchemas[entity as EntityType].safeParse(row).success).toBe(true)
  })

  it('keeps fields from newer versions when syncing', () => {
    const row = { ...rowsFrom1_2.item, pinned: true }
    expect(syncSchemas.item.parse(row)).toEqual(row)
  })

  it('accepts the first activity rows and keeps counts added later', () => {
    expect(entitySchemas.activity.safeParse(firstActivity).success).toBe(true)
    const later = {
      ...firstActivity,
      days: { '2026-10-19': { closed: 1, saved: 0, done: 0, notes: 4 } },
    }
    expect(syncSchemas.activity.parse(later)).toEqual(later)
  })
})
