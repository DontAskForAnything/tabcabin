import { describe, expect, it } from 'vitest'
import { shortcutFromEvent } from './keys'

const press = (
  key: string,
  mods: Partial<Record<'ctrl' | 'meta' | 'shift' | 'alt', boolean>> = {},
) => ({
  key,
  ctrlKey: !!mods.ctrl,
  metaKey: !!mods.meta,
  shiftKey: !!mods.shift,
  altKey: !!mods.alt,
})

describe('shortcutFromEvent', () => {
  it('records plain keys and modifiers in a fixed order', () => {
    expect(shortcutFromEvent(press('g'), false)).toBe('g')
    expect(shortcutFromEvent(press('K', { ctrl: true, shift: true }), false)).toBe('mod+shift+k')
    expect(shortcutFromEvent(press('Backspace', { meta: true, shift: true }), true)).toBe(
      'mod+shift+backspace',
    )
    expect(shortcutFromEvent(press(' ', { alt: true }), false)).toBe('alt+space')
  })

  it('ignores lone modifiers and the other platform modifier', () => {
    expect(shortcutFromEvent(press('Shift', { shift: true }), false)).toBeNull()
    expect(shortcutFromEvent(press('Control', { ctrl: true }), false)).toBeNull()
    expect(shortcutFromEvent(press('k', { meta: true }), false)).toBe('k')
  })
})
