import { useSyncExternalStore } from 'react'

export type ToastTone = 'success' | 'error' | 'info'

export interface ToastAction {
  label: string
  onClick: () => void
}

export interface ToastOptions {
  title: string
  description?: string
  tone?: ToastTone
  action?: ToastAction
  /** ms, default 4500 (7000 when there is an action) */
  duration?: number
}

export interface ToastEntry extends Required<Pick<ToastOptions, 'title' | 'tone'>> {
  id: number
  description?: string
  action?: ToastAction
  duration: number
}

type Listener = () => void

let entries: ToastEntry[] = []
let nextId = 1
const listeners = new Set<Listener>()
const timers = new Map<number, ReturnType<typeof setTimeout>>()
const MAX_VISIBLE = 4

function emit() {
  for (const listener of listeners) listener()
}

export function dismissToast(id: number) {
  const timer = timers.get(id)
  if (timer) clearTimeout(timer)
  timers.delete(id)
  entries = entries.filter((entry) => entry.id !== id)
  emit()
}

export function toast(options: ToastOptions): number {
  const id = nextId++
  const entry: ToastEntry = {
    id,
    title: options.title,
    description: options.description,
    tone: options.tone ?? 'info',
    action: options.action,
    duration: options.duration ?? (options.action ? 7000 : 4500),
  }
  entries = [...entries, entry].slice(-MAX_VISIBLE)
  timers.set(
    id,
    setTimeout(() => dismissToast(id), entry.duration),
  )
  emit()
  return id
}

export function clearToasts() {
  for (const timer of timers.values()) clearTimeout(timer)
  timers.clear()
  entries = []
  emit()
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useToasts(): ToastEntry[] {
  return useSyncExternalStore(
    subscribe,
    () => entries,
    () => entries,
  )
}
