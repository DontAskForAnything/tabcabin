import { describe, expect, it } from 'vitest'
import { duplicateTabIds, tabsToLinks } from './tabs'

const tab = (
  id: number,
  url: string,
  extra: Partial<{ active: boolean; pinned: boolean; title: string }> = {},
) => ({
  id,
  url,
  title: extra.title ?? '',
  favIconUrl: null,
  ...extra,
})

describe('tabs helpers', () => {
  it('converts savable tabs to links', () => {
    expect(
      tabsToLinks([
        tab(1, 'chrome://newtab/'),
        tab(2, 'https://a.com', { title: 'A' }),
        tab(3, 'https://b.com'),
      ]),
    ).toEqual([
      { url: 'https://a.com', title: 'A', favIconUrl: null },
      { url: 'https://b.com', title: 'https://b.com', favIconUrl: null },
    ])
  })

  it('finds duplicates and keeps the active tab', () => {
    const tabs = [
      tab(1, 'https://a.com/'),
      tab(2, 'https://www.a.com#x', { active: true }),
      tab(3, 'https://b.com'),
      tab(4, 'https://a.com'),
    ]
    expect(duplicateTabIds(tabs).sort()).toEqual([1, 4])
  })
})
