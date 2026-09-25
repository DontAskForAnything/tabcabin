import type { Config } from '../../config'

/** Extension redirect addresses (Chromium browsers and Firefox), optionally limited by id. */
export function extensionRedirect(value: string, config: Config): string | null {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return null
  }
  const match = /^([a-z0-9-]+)\.(chromiumapp\.org|extensions\.allizom\.org)$/i.exec(url.hostname)
  if (url.protocol !== 'https:' || !match || url.username || url.port) return null
  if (config.extensionIds.length > 0 && !config.extensionIds.includes(match[1]!.toLowerCase()))
    return null
  return url.toString()
}

export function withParams(address: string, params: Record<string, string>): string {
  const url = new URL(address)
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value)
  return url.toString()
}
