import { describe, expect, it } from 'vitest'
import { letterTileFor } from './LetterTile'

describe('letterTileFor', () => {
  it('uses the first letter of the host', () => {
    expect(letterTileFor('https://www.github.com').letter).toBe('G')
    expect(letterTileFor('łódź.pl').letter).toBe('Ł')
    expect(letterTileFor('---').letter).toBe('?')
  })

  it('is deterministic per host', () => {
    expect(letterTileFor('example.com')).toEqual(letterTileFor('https://example.com'))
  })
})
