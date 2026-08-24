/** True when the event target is a text field (shortcuts should not fire). */
export function isTyping(event: KeyboardEvent): boolean {
  const target = event.target as HTMLElement | null
  if (!target) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

export const isMac = () =>
  typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform)

/** Matches shortcuts written like "mod+k", "g", "mod+shift+backspace". */
export function matchesShortcut(event: KeyboardEvent, shortcut: string): boolean {
  const parts = shortcut.toLowerCase().split('+')
  const key = parts.pop()
  const mod = parts.includes('mod')
  const shift = parts.includes('shift')
  const alt = parts.includes('alt')
  const modPressed = isMac() ? event.metaKey : event.ctrlKey
  if (mod !== modPressed || shift !== event.shiftKey || alt !== event.altKey) return false
  if (!mod && (event.metaKey || event.ctrlKey)) return false
  return event.key.toLowerCase() === key
}

export function formatShortcut(shortcut: string): string {
  const mac = isMac()
  return shortcut
    .split('+')
    .map((part) => {
      const p = part.toLowerCase()
      if (p === 'mod') return mac ? '⌘' : 'Ctrl'
      if (p === 'shift') return mac ? '⇧' : 'Shift'
      if (p === 'alt') return mac ? '⌥' : 'Alt'
      if (p === 'backspace') return '⌫'
      return p.length === 1 ? p.toUpperCase() : p
    })
    .join(mac ? '' : '+')
}

const MODIFIER_KEYS = new Set(['shift', 'control', 'meta', 'alt', 'altgraph', 'capslock', 'fn'])

/** Turns a key press into the shortcut format ("mod+shift+k"); null for lone modifiers. */
export function shortcutFromEvent(
  event: Pick<KeyboardEvent, 'key' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey'>,
  mac = isMac(),
): string | null {
  const key = event.key === ' ' ? 'space' : event.key.toLowerCase()
  if (!key || MODIFIER_KEYS.has(key)) return null
  const parts: string[] = []
  if (mac ? event.metaKey : event.ctrlKey) parts.push('mod')
  if (event.shiftKey) parts.push('shift')
  if (event.altKey) parts.push('alt')
  parts.push(key)
  return parts.join('+')
}
