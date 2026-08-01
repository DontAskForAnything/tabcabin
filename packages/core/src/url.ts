/** Normalized form used to detect that a page is already saved. */
export function normalizeUrl(raw: string): string | null {
  if (!raw || raw.length > 4096) return null
  try {
    const url = new URL(raw)
    url.hash = ''
    url.hostname = url.hostname.toLowerCase().replace(/^www\./, '')
    let out = url.toString()
    if (out.endsWith('/')) out = out.slice(0, -1)
    return out
  } catch {
    return null
  }
}

/** Host without `www.` for display, e.g. "github.com". */
export function displayHost(raw: string | null | undefined): string {
  if (!raw) return ''
  try {
    return new URL(raw).hostname.replace(/^www\./, '')
  } catch {
    return raw
  }
}

/** Short, readable form of a URL: host + path, no protocol, no trailing slash. */
export function displayUrl(raw: string | null | undefined): string {
  if (!raw) return ''
  try {
    const url = new URL(raw)
    const path = url.pathname === '/' ? '' : url.pathname
    return `${url.hostname.replace(/^www\./, '')}${path}${url.search}`
  } catch {
    return raw
  }
}

const IMAGE_EXTENSIONS = /\.(png|jpe?g|gif|webp|avif|svg|bmp)(\?.*)?$/i

export function looksLikeUrl(text: string): boolean {
  const value = text.trim()
  if (!value || /\s/.test(value)) return false
  if (/^(https?|file):\/\//i.test(value)) return true
  return /^[a-z0-9-]+(\.[a-z0-9-]+)+(\/\S*)?$/i.test(value)
}

export function looksLikeImageUrl(text: string): boolean {
  return looksLikeUrl(text) && IMAGE_EXTENSIONS.test(text.trim())
}

/** Adds https:// to bare domains; leaves other schemes untouched. */
export function withProtocol(text: string): string {
  const value = text.trim()
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return value
  return `https://${value}`
}

/** URLs the browser can't open from a page or that make no sense to save. */
export function isSavableUrl(raw: string | null | undefined): boolean {
  if (!raw) return false
  return !/^(chrome|edge|brave|about|chrome-extension|moz-extension|devtools|view-source):/i.test(
    raw,
  )
}
