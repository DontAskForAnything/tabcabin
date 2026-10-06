import { describe, expect, it } from 'vitest'
import { isSyncServer } from './serverName'

describe('sync server name', () => {
  it('accepts TabCabin servers and servers from before the rename', () => {
    expect(isSyncServer('tabcabin')).toBe(true)
    expect(isSyncServer('tabhangar')).toBe(true)
    expect(isSyncServer('something-else')).toBe(false)
    expect(isSyncServer(undefined)).toBe(false)
  })
})
