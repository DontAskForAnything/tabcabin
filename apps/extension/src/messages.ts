/** Messages exchanged between the background worker and content scripts. */
export type ToastTone = 'success' | 'error' | 'info'

export interface ToastMessage {
  type: 'tabhangar:toast'
  title: string
  description?: string
  tone: ToastTone
  undoId?: string
  undoLabel?: string
  dismissLabel?: string
  theme?: 'light' | 'dark' | 'system'
}

export interface UndoMessage {
  type: 'tabhangar:undo'
  undoId: string
}

export interface PingMessage {
  type: 'tabhangar:ping'
  target: 'toast' | 'popover'
}

export interface TogglePopoverMessage {
  type: 'tabhangar:popover-toggle'
}

export interface PopoverDataRequest {
  type: 'tabhangar:popover-data'
  url: string
}

export interface PopoverSaveRequest {
  type: 'tabhangar:popover-save'
  page: { url: string; title: string; favIconUrl: string | null }
  target: { groupId: string } | { newGroupIn: string; title: string }
  note: { text: string; color: string | null; todo: boolean } | null
  /** One-time reminder for the saved link (or its to-do). */
  remindAt: number | null
  closeTab: boolean
}

/** Ask the background to synchronize now (e.g. when a board page opens). */
export interface SyncNowRequest {
  type: 'tabhangar:sync-now'
}

export interface OpenAppRequest {
  type: 'tabhangar:open-app'
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

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string' &&
    (value as { type: string }).type.startsWith('tabhangar:')
  )
}
