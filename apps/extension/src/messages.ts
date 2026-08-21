/** Messages exchanged between the background worker and content scripts. */
export type ToastTone = 'success' | 'error' | 'info'

export interface ToastMessage {
  type: 'tabhangar:toast'
  title: string
  description?: string
  tone: ToastTone
  undoId?: string
  undoLabel?: string
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
  closeTab: boolean
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

export function isRuntimeMessage(value: unknown): value is RuntimeMessage {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as { type?: unknown }).type === 'string' &&
    (value as { type: string }).type.startsWith('tabhangar:')
  )
}
