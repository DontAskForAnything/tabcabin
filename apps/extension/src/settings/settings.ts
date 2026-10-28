import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '@/db/db'
import type { ThemePreference } from '@tabcabin/ui'
import type { Locale } from '@/i18n'

export type ViewMode = 'board' | 'collections'
export type SidebarMode = 'rail' | 'pinned'
export type Density = 'comfortable' | 'compact'
/** Where a group's open button puts its links: a new window, or a tab group in this window. */
export type OpenGroupIn = 'window' | 'here'

export interface Shortcuts {
  newGroup: string
  search: string
  workspaces: string
  bin: string
}

export interface Settings {
  theme: ThemePreference
  locale: Locale
  activeWorkspaceId: string | null
  /** Last opened category per workspace. */
  activeCategoryIds: Record<string, string>
  /** Board or collections per category. */
  viewModes: Record<string, ViewMode>
  openLinksInNewTab: boolean
  focusExistingTab: boolean
  openGroupIn: OpenGroupIn
  closeTabOnSave: boolean
  density: Density
  showUrls: boolean
  showGroupEmoji: boolean
  sidebarMode: SidebarMode
  sidebarWidth: number
  trashZone: boolean
  /** Say so when a saved link is also in another group. */
  warnDuplicates: boolean
  /** Look at saved pages now and then and mark the ones that no longer load. */
  checkLinks: boolean
  /** A line about the week (tabs closed, links saved) in the tabs panel. */
  showWeek: boolean
  shortcuts: Shortcuts
  /** The notification permission was offered once (when the first reminder was set). */
  notificationsAsked: boolean
}

/** The browser's language when TabCabin speaks it, English otherwise. */
function browserLocale(): Settings['locale'] {
  const language = typeof navigator === 'undefined' ? '' : navigator.language
  return /^pl\b/i.test(language) ? 'pl' : 'en'
}

export const DEFAULT_SETTINGS: Settings = {
  theme: 'system',
  locale: browserLocale(),
  activeWorkspaceId: null,
  activeCategoryIds: {},
  viewModes: {},
  openLinksInNewTab: false,
  focusExistingTab: true,
  openGroupIn: 'window',
  closeTabOnSave: true,
  density: 'comfortable',
  showUrls: true,
  showGroupEmoji: true,
  sidebarMode: 'pinned',
  sidebarWidth: 292,
  trashZone: true,
  warnDuplicates: true,
  checkLinks: false,
  showWeek: true,
  shortcuts: { newGroup: 'g', search: 'mod+k', workspaces: 'mod+o', bin: 'mod+shift+backspace' },
  notificationsAsked: false,
}

function merge(rows: { key: string; value: unknown }[]): Settings {
  const settings: Settings = { ...DEFAULT_SETTINGS }
  const record = settings as unknown as Record<string, unknown>
  for (const row of rows) if (row.key in DEFAULT_SETTINGS) record[row.key] = row.value
  return settings
}

export async function getSettings(): Promise<Settings> {
  return merge(await db.settings.toArray())
}

export async function setSetting<K extends keyof Settings>(key: K, value: Settings[K]) {
  await db.settings.put({ key, value })
}

export async function updateSettings(patch: Partial<Settings>) {
  await db.settings.bulkPut(Object.entries(patch).map(([key, value]) => ({ key, value })))
}

/** Live settings (undefined while loading). */
export function useSettings(): Settings | undefined {
  return useLiveQuery(getSettings, [])
}
