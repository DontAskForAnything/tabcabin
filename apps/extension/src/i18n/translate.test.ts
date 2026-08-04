import { describe, expect, it } from 'vitest'
import { en } from './en'
import { pl } from './pl'
import { translate } from './translate'

describe('translate', () => {
  it('interpolates params', () => {
    expect(translate('en', 'count.links', { count: 1 })).toBe('1 link')
    expect(translate('en', 'count.links', { count: 3 })).toBe('3 links')
  })

  it('uses Polish plural rules', () => {
    expect(translate('pl', 'count.links', { count: 1 })).toBe('1 link')
    expect(translate('pl', 'count.links', { count: 3 })).toBe('3 linki')
    expect(translate('pl', 'count.links', { count: 5 })).toBe('5 linków')
    expect(translate('pl', 'count.tasks', { count: 22 })).toBe('22 zadania')
  })

  it('has the same keys in every language', () => {
    expect(Object.keys(pl).sort()).toEqual(Object.keys(en).sort())
  })
})
