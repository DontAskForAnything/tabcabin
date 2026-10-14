import { describe, expect, it } from 'vitest'
import { ico } from './ico.ts'

describe('ico', () => {
  it('lists each image with its size and where its bytes start', () => {
    const small = Buffer.from('small png')
    const large = Buffer.from('a larger png')
    const file = ico([
      [16, small],
      [48, large],
    ])

    expect(file.readUInt16LE(0)).toBe(0)
    expect(file.readUInt16LE(2)).toBe(1)
    expect(file.readUInt16LE(4)).toBe(2)
    const entry = (index: number) => {
      const at = 6 + 16 * index
      return {
        width: file.readUInt8(at),
        height: file.readUInt8(at + 1),
        bits: file.readUInt16LE(at + 6),
        length: file.readUInt32LE(at + 8),
        offset: file.readUInt32LE(at + 12),
      }
    }
    expect(entry(0)).toEqual({ width: 16, height: 16, bits: 32, length: small.length, offset: 38 })
    expect(entry(1)).toEqual({
      width: 48,
      height: 48,
      bits: 32,
      length: large.length,
      offset: 38 + small.length,
    })
    expect(file.subarray(38, 38 + small.length)).toEqual(small)
    expect(file.subarray(38 + small.length)).toEqual(large)
  })
})
