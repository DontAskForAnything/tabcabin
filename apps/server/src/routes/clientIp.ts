import { getConnInfo } from '@hono/node-server/conninfo'
import type { Context } from 'hono'
import type { Config } from '../config'

/** The caller's address; behind a trusted proxy, the first X-Forwarded-For entry. */
export function clientIp(c: Context, config: Config): string {
  if (config.trustProxy) {
    const forwarded = c.req.header('x-forwarded-for')?.split(',')[0]?.trim()
    if (forwarded) return forwarded
  }
  try {
    return getConnInfo(c).remote.address ?? 'unknown'
  } catch {
    return 'unknown'
  }
}
