import type { Config } from '../config'
import type { Db } from '../db/client'
import { countUsers } from '../users'
import { RateLimiter } from './rateLimit'

export type SignupBlock = 'too_many_signups' | 'server_full'

/**
 * Anti-abuse limits for new accounts, shared by password signup and Google sign-in: a total
 * cap (MAX_USERS) and a few accounts per address per day (SIGNUPS_PER_IP_PER_DAY).
 */
export class SignupGuard {
  private readonly perIp: RateLimiter

  constructor(
    private readonly db: Db,
    private readonly config: Config,
  ) {
    this.perIp = new RateLimiter(config.signupsPerIpPerDay, 24 * 60 * 60_000)
  }

  blocked(ip: string, now: number): SignupBlock | null {
    if (this.config.maxUsers > 0 && countUsers(this.db) >= this.config.maxUsers)
      return 'server_full'
    return this.perIp.retryAfter(ip, now) > 0 ? 'too_many_signups' : null
  }

  created(ip: string, now: number) {
    this.perIp.hit(ip, now)
  }
}
