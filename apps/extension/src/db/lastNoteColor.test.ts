import { beforeEach, describe, expect, it } from 'vitest'
import { db } from './db'
import { getLastNoteColor, rememberNoteColor } from './lastNoteColor'

beforeEach(async () => {
  db.close()
  await db.delete()
  await db.open()
})

describe('last note colour', () => {
  it('starts with none, keeps the last one and forgets it for no colour', async () => {
    expect(await getLastNoteColor()).toBeNull()
    await rememberNoteColor('lilac')
    await rememberNoteColor('teal')
    expect(await getLastNoteColor()).toBe('teal')
    await rememberNoteColor(null)
    expect(await getLastNoteColor()).toBeNull()
  })

  it('ignores a value that is not a note colour', async () => {
    await db.meta.put({ key: 'notes.lastColor', value: 'purple' })
    expect(await getLastNoteColor()).toBeNull()
  })
})
