import type { Category, EntityType, Group, Item, Reminder, Workspace } from '@tabcabin/core'
import { Dexie, type EntityTable, type Table } from 'dexie'

export interface OutboxEntry {
  entity: EntityType
  id: string
  type: 'put' | 'purge'
  queuedAt: number
}

interface SettingRow {
  key: string
  value: unknown
}

interface MetaRow {
  key: string
  value: unknown
}

class TabHangarDB extends Dexie {
  workspaces!: EntityTable<Workspace, 'id'>
  categories!: EntityTable<Category, 'id'>
  groups!: EntityTable<Group, 'id'>
  items!: EntityTable<Item, 'id'>
  reminders!: EntityTable<Reminder, 'id'>
  settings!: EntityTable<SettingRow, 'key'>
  meta!: EntityTable<MetaRow, 'key'>
  outbox!: Table<OutboxEntry, [EntityType, string]>

  constructor(name = 'tabhangar') {
    super(name)
    this.version(1).stores({
      workspaces: 'id, position, deletedAt',
      categories: 'id, workspaceId, deletedAt',
      groups: 'id, categoryId, deletedAt',
      items: 'id, groupId, parentId, url, deletedAt',
      reminders: 'id, itemId, dueAt, deletedAt',
      settings: 'key',
      meta: 'key',
      outbox: '[entity+id], queuedAt',
    })
  }
}

export const db = new TabHangarDB()

export const tables = {
  workspace: () => db.workspaces,
  category: () => db.categories,
  group: () => db.groups,
  item: () => db.items,
  reminder: () => db.reminders,
} satisfies Record<EntityType, () => Table>
