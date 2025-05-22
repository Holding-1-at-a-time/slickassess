import { Redis } from "@upstash/redis"

// Initialize Redis client if credentials are available
let redis: Redis | null = null

if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  })
}

class RateLimiter {
  /**
   * Checks if a key has exceeded its rate limit
   * @param key The unique identifier for the rate limit
   * @param limit The maximum number of requests allowed
   * @param window The time window in seconds
   * @returns True if rate limited, false otherwise
   */
  async limit(key: string, limit: number, window: number): Promise<boolean> {
    // If Redis is not available, don't rate limit
    if (!redis) {
      return false
    }

    const now = Math.floor(Date.now() / 1000)
    const windowStart = now - window

    try {
      // Add the current timestamp to the list
      await redis.zadd(key, { score: now, member: `${now}-${Math.random()}` })

      // Remove timestamps outside the window
      await redis.zremrangebyscore(key, 0, windowStart)

      // Count the number of requests in the current window
      const count = await redis.zcard(key)

      // Set the expiry on the key to match the window
      await redis.expire(key, window)

      // Return true if rate limited
      return count > limit
    } catch (error) {
      console.error("Rate limiter error:", error)
      // If there's an error with Redis, don't rate limit
      return false
    }
  }
}

export const rateLimiter = new RateLimiter()
