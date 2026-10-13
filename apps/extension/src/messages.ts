/** Messages exchanged between the background worker and content scripts. */
export type ToastTone = 'success' | 'error' | 'info'

export interface ToastMessage {
  type: 'tabcabin:toast'
  title: string
  description?: string
  tone: ToastTone
  undoId?: string
  undoLabel?: string
  dismissLabel?: string
  theme?: 'light' | 'dark' | 'system'
}

interface UndoMessage {
  type: 'tabcabin:undo'
  undoId: string
}

interface PingMessage {
  type: 'tabcabin:ping'
  target: 'toast' | 'popover'
}

interface TogglePopoverMessage {
  type: 'tabcabin:popover-toggle'
}

interface PopoverDataRequest {
  type: 'tabcabin:popover-data'
  url: string
}

export interface PopoverSaveRequest {
  type: 'tabcabin:popover-save'
  page: { url: string; title: string; favIconUrl: string | null }
  target: { groupId: string } | { newGroupIn: string; title: string }
  note: { text: string; color: string | null; todo: boolean } | null
  /** One-time reminder for the saved link (or its to-do). */
  remindAt: number | null
  closeTab: boolean
}

/** Ask the background to synchronize now (e.g. when a board page opens). */
interface SyncNowRequest {
  type: 'tabcabin:sync-now'
}

interface OpenAppRequest {
  type: 'tabcabin:open-app'
}

/** Ask the background to look at saved links now (right after link checks are turned on). */
interface CheckLinksRequest {
  type: 'tabcabin:check-links'
}

export type RuntimeMessage =
  | ToastMessage
  | UndoMessage
  | PingMessage
  | TogglePopoverMessage
  | PopoverDataRequest
  | PopoverSaveRequest
  | OpenAppRequest
  | SyncNowRequest
  | CheckLinksRequest

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string' &&
    (value as { type: string }).type.startsWith('tabcabin:')
  )
}
