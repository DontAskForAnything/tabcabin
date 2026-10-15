import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Locale } from '@/i18n'
import { translate } from '@/i18n/translate'
import { seedText } from './seedText'

const tasks = (locale: Locale, platform: string) => {
  vi.stubGlobal('navigator', { platform })
  return seedText((key, params) => translate(locale, key, params)).tasks
}

describe('seedText', () => {
  afterEach(() => vi.unstubAllGlobals())

  it("names this computer's keys in the search tip", () => {
    expect(tasks('en', 'Win32')[1]).toBe('Press Ctrl+K to search everything')
    expect(tasks('en', 'Linux x86_64')[1]).toBe('Press Ctrl+K to search everything')
    expect(tasks('en', 'MacIntel')[1]).toBe('Press ⌘K to search everything')
    expect(tasks('pl', 'Win32')[1]).toBe('Naciśnij Ctrl+K, żeby wszystko przeszukać')
  })

  it('leaves no placeholder in any text', () => {
    for (const locale of ['en', 'pl'] as const) {
      vi.stubGlobal('navigator', { platform: 'Win32' })
      const seed = seedText((key, params) => translate(locale, key, params))
      expect(Object.values(seed).flat().join('\n')).not.toMatch(/[{}]/)
    }
  })
})
