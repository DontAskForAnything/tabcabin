import {
  AppWindow,
  Bell,
  Cloud,
  Highlighter,
  Layers,
  LayoutGrid,
  Link2,
  ListTodo,
  type LucideIcon,
  MousePointerClick,
  MousePointer2,
  Rows3,
  Trash2,
  Unlink,
} from 'lucide-react'
import type { MessageKey } from '@/i18n'
import { formatShortcut } from '@/lib/keys'
import type { Settings } from '@/settings/settings'
import type { Command } from '../shared/useCommandShortcut'

/** What a tip's button does. */
export type TipAction =
  'search' | 'bin' | 'collections' | 'appearance' | 'general' | 'account' | 'shortcuts'

/** What the tips may look at to leave out the ones that would tell nothing new. */
export interface TipContext {
  settings: Settings
  signedIn: boolean
  canSignIn: boolean
  /** The browser shortcuts of the extension ('' when none is set). */
  commands: Record<Command, string>
}

export interface Tip {
  id: string
  text: MessageKey
  /** The keys that do it, shown large on top; '' leaves the tip out. */
  keys?: (context: TipContext) => string
  /** Shown on top when there are no keys. */
  icon?: LucideIcon
  action?: TipAction
  skip?: (context: TipContext) => boolean
}

/**
 * The tips in the order they come, one every few days. Things the welcome already showed
 * (searching, the save shortcuts) come late.
 */
export const TIPS: readonly Tip[] = [
  { id: 'saveLink', text: 'tips.saveLink', icon: MousePointerClick },
  { id: 'saveSelection', text: 'tips.saveSelection', icon: Highlighter },
  { id: 'todo', text: 'tips.todo', icon: ListTodo },
  {
    id: 'newGroup',
    text: 'tips.newGroup',
    keys: ({ settings }) => formatShortcut(settings.shortcuts.newGroup),
  },
  { id: 'stack', text: 'tips.stack', icon: Layers },
  { id: 'select', text: 'tips.select', icon: MousePointer2 },
  { id: 'saveWindow', text: 'tips.saveWindow', icon: AppWindow },
  {
    id: 'collections',
    text: 'tips.collections',
    icon: LayoutGrid,
    action: 'collections',
    skip: ({ settings }) => Object.values(settings.viewModes).includes('collections'),
  },
  { id: 'bin', text: 'tips.bin', icon: Trash2, action: 'bin' },
  { id: 'repeat', text: 'tips.repeat', icon: Bell },
  {
    id: 'workspaces',
    text: 'tips.workspaces',
    keys: ({ settings }) => formatShortcut(settings.shortcuts.workspaces),
  },
  {
    id: 'density',
    text: 'tips.density',
    icon: Rows3,
    action: 'appearance',
    skip: ({ settings }) => settings.density === 'compact',
  },
  {
    id: 'linkChecks',
    text: 'tips.linkChecks',
    icon: Unlink,
    action: 'general',
    skip: ({ settings }) => settings.checkLinks,
  },
  {
    id: 'openHere',
    text: 'tips.openHere',
    icon: Layers,
    action: 'general',
    skip: ({ settings }) => settings.openGroupIn === 'here',
  },
  { id: 'shortcuts', text: 'tips.shortcuts', keys: () => '?', action: 'shortcuts' },
  {
    id: 'search',
    text: 'tips.search',
    keys: ({ settings }) => formatShortcut(settings.shortcuts.search),
    action: 'search',
  },
  { id: 'savePage', text: 'tips.savePage', keys: ({ commands }) => commands._execute_action },
  { id: 'inbox', text: 'tips.inbox', keys: ({ commands }) => commands['save-to-inbox'] },
  {
    id: 'signIn',
    text: 'tips.signIn',
    icon: Cloud,
    action: 'account',
    skip: ({ canSignIn }) => !canSignIn,
  },
  { id: 'share', text: 'tips.share', icon: Link2, skip: ({ signedIn }) => !signedIn },
]

/** The tips worth showing on this computer, with their keys worked out. */
export function availableTips(tips: readonly Tip[], context: TipContext) {
  return tips.flatMap((tip) => {
    const keys = tip.keys?.(context)
    if (keys === '' || tip.skip?.(context)) return []
    return [{ ...tip, keys }]
  })
}
