/** Fixed-window counters kept in memory (one server process). */
export class RateLimiter {
  private hits = new Map<string, { count: number; resetAt: number }>()

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
  ) {}

  /** Seconds to wait when `key` is over the limit, otherwise 0. */
  retryAfter(key: string, now = Date.now()): number {
    const entry = this.hits.get(key)
    if (!entry || entry.resetAt <= now || entry.count < this.limit) return 0
    return Math.ceil((entry.resetAt - now) / 1000)
  }

  hit(key: string, now = Date.now()) {
    const entry = this.hits.get(key)
    if (!entry || entry.resetAt <= now)
      this.hits.set(key, { count: 1, resetAt: now + this.windowMs })
    else entry.count += 1
    if (this.hits.size > 10_000) this.sweep(now)
  }

  reset(key: string) {
    this.hits.delete(key)
  }

  private sweep(now: number) {
    for (const [key, entry] of this.hits) if (entry.resetAt <= now) this.hits.delete(key)
  }
}
