import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

/** The manifest's own texts (name, summary, shortcut names), which the store shows per language. */
const dir = new URL('../../public/_locales/', import.meta.url)
const locales = readdirSync(dir)
const messages = (locale: string) =>
  JSON.parse(readFileSync(new URL(`${locale}/messages.json`, dir), 'utf8')) as Record<
    string,
    { message: string }
  >

describe('manifest locales', () => {
  it('has the store languages', () => {
    expect(locales.sort()).toEqual(['de', 'en', 'es', 'fr', 'ja', 'pl', 'pt_BR'])
  })

  it('has every message in every language', () => {
    const keys = Object.keys(messages('en')).sort()
    for (const locale of locales) expect(Object.keys(messages(locale)).sort()).toEqual(keys)
  })

  it('fits the limits of Chrome and the store', () => {
    for (const locale of locales) {
      const m = messages(locale)
      expect(m.extName!.message.length).toBeLessThanOrEqual(75)
      expect(m.extDescription!.message.length).toBeLessThanOrEqual(132)
      expect(m.extShortName!.message).toBe('TabCabin')
      expect(m.extName!.message.startsWith('TabCabin – ')).toBe(true)
    }
  })
})
