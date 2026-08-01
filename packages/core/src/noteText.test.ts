import { describe, expect, it } from 'vitest'
import { applyNoteShortcuts } from './noteText'

describe('applyNoteShortcuts', () => {
  it('turns dashes into bullets and arrows', () => {
    expect(applyNoteShortcuts('- one\n- two').text).toBe('• one\n• two')
    expect(applyNoteShortcuts('a -> b <- c').text).toBe('a → b ← c')
  })

  it('handles slash commands at the end', () => {
    expect(applyNoteShortcuts('buy milk /todo')).toEqual({ text: 'buy milk', todo: true })
    expect(applyNoteShortcuts('buy milk /done')).toEqual({
      text: 'buy milk',
      todo: true,
      done: true,
    })
    expect(applyNoteShortcuts('/todo')).toEqual({ text: '', todo: true })
  })

  it('leaves normal text alone', () => {
    expect(applyNoteShortcuts('see /todo list later')).toEqual({ text: 'see /todo list later' })
  })
})
