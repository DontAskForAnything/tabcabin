import type { Message } from './types'

export const en = {
  'app.name': 'TabHangar',
  'common.cancel': 'Cancel',
  'common.close': 'Close',
  'common.delete': 'Delete',
  'common.done': 'Done',
  'common.save': 'Save',
  'common.undo': 'Undo',
  'common.rename': 'Rename',
  'common.search': 'Search',
  'common.more': 'More',
  'count.links': { one: '{count} link', other: '{count} links' },
  'count.notes': { one: '{count} note', other: '{count} notes' },
  'count.tasks': { one: '{count} task', other: '{count} tasks' },
} satisfies Record<string, Message>

export type MessageKey = keyof typeof en
