import { describe, expect, it } from 'vitest'
import { templateInTabs, templateOfUrl } from './installTemplate'

const SITE = 'https://tabs.example.com'
const ID = 'eldaiannnllgnlgilfocoibpdjmngcfp'
const STORE = `https://chromewebstore.google.com/detail/tabcabin/${ID}`

describe('the template picked before installing', () => {
  it('reads template pages of the website', () => {
    expect(templateOfUrl(`${SITE}/templates/trip/`, SITE, ID)).toBe('trip')
    expect(templateOfUrl(`${SITE}/templates/job-hunt`, SITE, ID)).toBe('job-hunt')
    expect(templateOfUrl(`${SITE}/templates/`, SITE, ID)).toBeNull()
    expect(templateOfUrl(`${SITE}/templates/camping/`, SITE, ID)).toBeNull()
    expect(templateOfUrl(`${SITE}/guides/trip/`, SITE, ID)).toBeNull()
  })

  it('ignores other sites and builds without a website', () => {
    expect(templateOfUrl('https://elsewhere.example.org/templates/trip/', SITE, ID)).toBeNull()
    expect(templateOfUrl(`${SITE}/templates/trip/`, undefined, ID)).toBeNull()
    expect(templateOfUrl('not a url', SITE, ID)).toBeNull()
    expect(templateOfUrl(undefined, SITE, ID)).toBeNull()
  })

  it('reads the store page a template page links to', () => {
    const link = `${STORE}?utm_source=website&utm_medium=template&utm_campaign=study`
    expect(templateOfUrl(link, SITE, ID)).toBe('study')
    expect(templateOfUrl(link, undefined, ID)).toBe('study')
    expect(templateOfUrl(`${STORE}?utm_campaign=study`, SITE, ID)).toBeNull()
    expect(templateOfUrl(link.replace(ID, 'a'.repeat(32)), SITE, ID)).toBeNull()
  })

  it('takes the tab used last', () => {
    const tabs = [
      { url: `${SITE}/templates/trip/`, lastAccessed: 10 },
      { url: `${SITE}/templates/study/`, lastAccessed: 30 },
      { url: 'https://example.org/', lastAccessed: 50 },
      { url: `${SITE}/templates/moving/` },
    ]
    expect(templateInTabs(tabs, SITE, ID)).toBe('study')
    expect(templateInTabs([{ url: 'chrome://newtab/' }], SITE, ID)).toBeNull()
  })
})
