/**
 * Per-IP rate limiting backed by Upstash Redis (sliding window).
 *
 * DORMANT when UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN are unset —
 * checkRateLimit() returns { ok: true } immediately so production keeps working
 * until Upstash is provisioned (same pattern as the Google OAuth integration).
 *
 * Fails OPEN on Redis errors: a limiter outage never blocks legitimate traffic.
 */

const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN

const upstashEnabled = Boolean(UPSTASH_URL && UPSTASH_TOKEN)

// Lazily-built limiter cache keyed by "limit:windowSeconds"
const limiterCache = new Map<string, import('@upstash/ratelimit').Ratelimit>()

async function getLimiter(
  limit: number,
  windowSeconds: number,
): Promise<import('@upstash/ratelimit').Ratelimit> {
  const cacheKey = `${limit}:${windowSeconds}`
  if (limiterCache.has(cacheKey)) return limiterCache.get(cacheKey)!

  const { Ratelimit } = await import('@upstash/ratelimit')
  const { Redis } = await import('@upstash/redis')

  const redis = new Redis({ url: UPSTASH_URL!, token: UPSTASH_TOKEN! })
  const ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowSeconds} s`),
    analytics: false,
  })

  limiterCache.set(cacheKey, ratelimit)
  return ratelimit
}

/**
 * Check whether `key` is within the sliding-window budget.
 *
 * Defaults:
 *   limit         = 10  (requests)
 *   windowSeconds = 60  (1 minute)
 *
 * Recommended presets:
 *   Bookings: checkRateLimit(key, 5, 60)
 *   Search:   checkRateLimit(key, 30, 60)
 *   All:      checkRateLimit(key, 60, 60)
 */
export async function checkRateLimit(
  key: string,
  limit = 10,
  windowSeconds = 60,
): Promise<{ ok: boolean }> {
  if (!upstashEnabled) return { ok: true }

  try {
    const limiter = await getLimiter(limit, windowSeconds)
    const result = await limiter.limit(key)
    return { ok: result.success }
  } catch (err) {
    // Fail open: Redis outage should never block legitimate traffic
    console.error('[ratelimit] Upstash error — failing open:', err)
    return { ok: true }
  }
}

/**
 * Extract the best-effort client IP from a Request.
 * Reads x-forwarded-for (first address) and falls back to 'anon'.
 */
export function clientIp(req: Request | { headers?: { get?: (h: string) => string | null } }): string {
  try {
    const forwarded = req?.headers?.get?.('x-forwarded-for')
    if (forwarded) {
      const first = forwarded.split(',')[0].trim()
      if (first) return first
    }
  } catch {
    // ignore — fall through to default
  }
  return 'anon'
}
