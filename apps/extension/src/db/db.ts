import type {
  Activity,
  Category,
  EntityType,
  Group,
  Item,
  Reminder,
  Workspace,
} from '@tabcabin/core'
import { Dexie, type EntityTable, type Table } from 'dexie'
import { moveClosedTabs } from './activity/upgrade'
import { moveLegacyDatabase } from './legacy'

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

/** What the last look at a saved address found (this browser only, never synced). */
export interface LinkCheck {
  /** The address as `normalizeUrl` writes it. */
  url: string
  checkedAt: number
  /** HTTP status of the last answer, null when the page did not answer at all. */
  status: number | null
  /** Failed looks in a row (no answer, or an error from the server). */
  failures: number
  broken: boolean
}

export class TabCabinDB extends Dexie {
  workspaces!: EntityTable<Workspace, 'id'>
  categories!: EntityTable<Category, 'id'>
  groups!: EntityTable<Group, 'id'>
  items!: EntityTable<Item, 'id'>
  reminders!: EntityTable<Reminder, 'id'>
  activity!: EntityTable<Activity, 'id'>
  settings!: EntityTable<SettingRow, 'key'>
  meta!: EntityTable<MetaRow, 'key'>
  outbox!: Table<OutboxEntry, [EntityType, string]>
  linkChecks!: EntityTable<LinkCheck, 'url'>

  constructor(name = 'tabcabin') {
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
    this.version(2).stores({ linkChecks: 'url, checkedAt' })
    this.version(3).stores({ activity: 'id' }).upgrade(moveClosedTabs)
    // Data saved under the old app name moves over before the first query runs.
    this.on('ready', (vip) =>
      moveLegacyDatabase(vip).then(
        () => undefined,
        (error: unknown) => console.warn('Could not move the old database', error),
      ),
    )
  }
}

export const db = new TabCabinDB()

export const tables = {
  workspace: () => db.workspaces,
  category: () => db.categories,
  group: () => db.groups,
  item: () => db.items,
  reminder: () => db.reminders,
  activity: () => db.activity,
} satisfies Record<EntityType, () => Table>
