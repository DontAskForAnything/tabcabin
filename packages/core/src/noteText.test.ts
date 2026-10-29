import { describe, expect, it } from 'vitest'
import { applyNoteShortcuts, applyTypedNoteShortcuts } from './noteText'

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

  it('handles slash commands at the start, in the middle and on their own line', () => {
    expect(applyNoteShortcuts('/todo buy milk')).toEqual({ text: 'buy milk', todo: true })
    expect(applyNoteShortcuts('  /done buy milk')).toEqual({
      text: 'buy milk',
      todo: true,
      done: true,
    })
    expect(applyNoteShortcuts('buy /todo milk')).toEqual({ text: 'buy milk', todo: true })
    expect(applyNoteShortcuts('/todo - milk')).toEqual({ text: '• milk', todo: true })
    expect(applyNoteShortcuts('/todo ')).toEqual({ text: '', todo: true })
    expect(applyNoteShortcuts('/todo buy milk /done')).toEqual({
      text: 'buy milk',
      todo: true,
      done: true,
    })
    expect(applyNoteShortcuts('milk\n/todo bread')).toEqual({ text: 'milk\nbread', todo: true })
    expect(applyNoteShortcuts('milk /todo\nbread')).toEqual({ text: 'milk\nbread', todo: true })
  })

  it('leaves normal text alone', () => {
    expect(applyNoteShortcuts('/todolist for later')).toEqual({ text: '/todolist for later' })
    expect(applyNoteShortcuts('see example.com/todo')).toEqual({ text: 'see example.com/todo' })
  })
})

describe('applyTypedNoteShortcuts', () => {
  const typed = (text: string) => applyTypedNoteShortcuts(text.replace('|', ''), text.indexOf('|'))

  it('takes a command typed at the end, at the start or in the middle', () => {
    expect(typed('buy milk /todo|')).toEqual({ text: 'buy milk', caret: 8, todo: true })
    expect(typed('/todo|')).toEqual({ text: '', caret: 0, todo: true })
    expect(typed('/todo |buy milk')).toEqual({ text: 'buy milk', caret: 0, todo: true })
    expect(typed('buy /todo |milk')).toEqual({ text: 'buy milk', caret: 4, todo: true })
    expect(typed('buy /done| milk')).toEqual({ text: 'buy milk', caret: 4, todo: true, done: true })
    expect(typed('milk\n/todo|')).toEqual({ text: 'milk\n', caret: 5, todo: true })
  })

  it('leaves commands that were already in the note', () => {
    expect(typed('Type /todo to make a task. Also|')).toEqual({
      text: 'Type /todo to make a task. Also',
      caret: 31,
    })
    expect(typed('/|Type /todo to make a task')).toEqual({
      text: '/Type /todo to make a task',
      caret: 1,
    })
  })

  it('waits while the word goes on', () => {
    expect(typed('/todo|s for later')).toEqual({ text: '/todos for later', caret: 5 })
  })
})
