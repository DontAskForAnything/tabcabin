import { describe, expect, it } from 'vitest'
import {
  displayHost,
  displayUrl,
  isSavableUrl,
  looksLikeImageUrl,
  looksLikeUrl,
  normalizeUrl,
  withProtocol,
} from './url'

describe('url helpers', () => {
  it('normalizes urls for duplicate detection', () => {
    expect(normalizeUrl('https://WWW.Example.com/path/#section')).toBe('https://example.com/path')
    expect(normalizeUrl('https://example.com/')).toBe('https://example.com')
    expect(normalizeUrl('not a url')).toBeNull()
  })

  it('formats urls for display', () => {
    expect(displayHost('https://www.github.com/foo')).toBe('github.com')
    expect(displayUrl('https://www.github.com/foo?x=1')).toBe('github.com/foo?x=1')
    expect(displayUrl('https://example.com/')).toBe('example.com')
  })

  it('detects urls and image urls in text', () => {
    expect(looksLikeUrl('github.com/foo')).toBe(true)
    expect(looksLikeUrl('https://a.b')).toBe(true)
    expect(looksLikeUrl('hello world')).toBe(false)
    expect(looksLikeImageUrl('https://x.com/cat.png?w=200')).toBe(true)
    expect(looksLikeImageUrl('https://x.com/cat')).toBe(false)
  })

  it('adds protocol only when missing', () => {
    expect(withProtocol('example.com')).toBe('https://example.com')
    expect(withProtocol('file:///home/me/a.pdf')).toBe('file:///home/me/a.pdf')
  })

  it('rejects browser-internal pages', () => {
    expect(isSavableUrl('chrome://newtab/')).toBe(false)
    expect(isSavableUrl('https://example.com')).toBe(true)
  })
})
