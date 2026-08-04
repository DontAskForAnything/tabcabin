import type { MessageKey } from './en'
import type { Message } from './types'

export const pl: Record<MessageKey, Message> = {
  'app.name': 'TabHangar',
  'common.cancel': 'Anuluj',
  'common.close': 'Zamknij',
  'common.delete': 'Usuń',
  'common.done': 'Gotowe',
  'common.save': 'Zapisz',
  'common.undo': 'Cofnij',
  'common.rename': 'Zmień nazwę',
  'common.search': 'Szukaj',
  'common.more': 'Więcej',
  'count.links': {
    one: '{count} link',
    few: '{count} linki',
    many: '{count} linków',
    other: '{count} linku',
  },
  'count.notes': {
    one: '{count} notatka',
    few: '{count} notatki',
    many: '{count} notatek',
    other: '{count} notatki',
  },
  'count.tasks': {
    one: '{count} zadanie',
    few: '{count} zadania',
    many: '{count} zadań',
    other: '{count} zadania',
  },
}
