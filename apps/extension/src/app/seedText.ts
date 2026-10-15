import type { SeedText } from '@/db/seed'
import type { Translate } from '@/i18n'
import { formatShortcut } from '@/lib/keys'
import { DEFAULT_SETTINGS } from '@/settings/settings'

/**
 * The starter board's texts. They are written into the board once, so the search tip names the
 * keys of the computer it is made on: Ctrl+K on Windows and Linux, ⌘K on a Mac.
 */
export const seedText = (t: Translate): SeedText => ({
  workspace: t('seed.workspace'),
  categories: [t('seed.today'), t('seed.readLater'), t('seed.projects')],
  quickLinks: t('seed.quickLinks'),
  todo: t('seed.todo'),
  welcome: t('seed.welcome'),
  readLater: t('seed.articles'),
  tasks: [
    t('seed.task1'),
    t('seed.task2', { keys: formatShortcut(DEFAULT_SETTINGS.shortcuts.search) }),
    t('seed.task3'),
  ],
  doneTask: t('seed.doneTask'),
  welcomeNote: t('seed.welcomeNote'),
  tipNote: t('seed.tipNote'),
})
