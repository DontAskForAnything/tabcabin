import { NOTE_COLORS, type NoteColor } from '@tabcabin/core'
import { db } from './db'

/**
 * The colour of the last note written in Edit link or the save window, kept in this browser
 * only, so the next note starts with it.
 */
const KEY = 'notes.lastColor'

/** The colour to start a new note with; null when none was used yet (or no colour was). */
export async function getLastNoteColor(): Promise<NoteColor | null> {
  const value = (await db.meta.get(KEY))?.value
  return NOTE_COLORS.includes(value as NoteColor) ? (value as NoteColor) : null
}

export async function rememberNoteColor(color: NoteColor | null): Promise<void> {
  if (color) await db.meta.put({ key: KEY, value: color })
  else await db.meta.delete(KEY)
}
