import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

interface RateLimitConfig {
  identifier: string
  action: string
  limit: number
  timeframe: number // in seconds
}

interface RateLimitResult {
  success: boolean
  remaining: number
  resetTime: number
}

/**
 * Check rate limit for a given action
 * @param config - Rate limit configuration
 * @returns Rate limit result
 */
export async function checkRateLimit(config: RateLimitConfig): Promise<RateLimitResult> {
  try {
    const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

    const now = Date.now()
    const windowStart = Math.floor(now / (config.timeframe * 1000)) * (config.timeframe * 1000)

    // Get current rate limit record
    const rateLimitRecord = await convex.query(api.rateLimits.getRateLimit, {
      identifier: config.identifier,
      action: config.action,
    })

    if (!rateLimitRecord || rateLimitRecord.windowStart < windowStart) {
      // Create new rate limit record
      await convex.mutation(api.rateLimits.createRateLimit, {
        identifier: config.identifier,
        action: config.action,
        count: 1,
        windowStart,
        expiresAt: windowStart + config.timeframe * 1000,
      })

      return {
        success: true,
        remaining: config.limit - 1,
        resetTime: windowStart + config.timeframe * 1000,
      }
    }

    if (rateLimitRecord.count >= config.limit) {
      return {
        success: false,
        remaining: 0,
        resetTime: rateLimitRecord.windowStart + config.timeframe * 1000,
      }
    }

    // Increment count
    await convex.mutation(api.rateLimits.incrementRateLimit, {
      identifier: config.identifier,
      action: config.action,
    })

    return {
      success: true,
      remaining: config.limit - (rateLimitRecord.count + 1),
      resetTime: rateLimitRecord.windowStart + config.timeframe * 1000,
    }
  } catch (error) {
    console.error("Rate limit check failed:", error)
    // Fail open - allow the request if rate limiting fails
    return {
      success: true,
      remaining: 0,
      resetTime: Date.now() + config.timeframe * 1000,
    }
  }
}
