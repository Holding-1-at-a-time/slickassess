import { v } from "convex/values"
import { mutation, query, internalMutation, internalQuery } from "../_generated/server"
import { ConvexError } from "convex/values"

/**
 * Rate limiting configuration
 */
export interface RateLimitConfig {
  // Maximum number of requests allowed in the time window
  maxRequests: number
  // Time window in milliseconds
  windowMs: number
  // Optional message to return when rate limited
  message?: string
}

// Default rate limit configurations
export const rateLimits = {
  // Public assessment submission - 5 requests per minute per IP
  publicAssessment: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    message: "Too many assessment submissions. Please try again later.",
  },
  // Image upload - 20 uploads per minute per IP
  imageUpload: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
    message: "Too many image uploads. Please try again later.",
  },
  // QR code scan - 30 scans per minute per IP
  qrScan: {
    maxRequests: 30,
    windowMs: 60 * 1000, // 1 minute
    message: "Too many QR code scans. Please try again later.",
  },
}

/**
 * Check if a request should be rate limited
 * @param identifier Unique identifier for the requester (IP address, user ID, etc.)
 * @param action The action being rate limited
 * @param config Rate limit configuration
 * @returns Object with isRateLimited flag and reset time
 */
export const checkRateLimit = internalQuery({
  args: {
    identifier: v.string(),
    action: v.string(),
    config: v.object({
      maxRequests: v.number(),
      windowMs: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    const { identifier, action, config } = args
    const now = Date.now()
    const windowStart = now - config.windowMs

    // Get recent requests for this identifier and action
    const requests = await ctx.db
      .query("rateLimits")
      .withIndex("by_identifier_action_timestamp", (q) =>
        q.eq("identifier", identifier).eq("action", action).gt("timestamp", windowStart),
      )
      .collect()

    // Check if rate limit is exceeded
    const isRateLimited = requests.length >= config.maxRequests

    // Calculate reset time (when the oldest request will expire from the window)
    let resetTime = now + config.windowMs
    if (requests.length > 0) {
      // Sort by timestamp ascending to get the oldest request
      requests.sort((a, b) => a.timestamp - b.timestamp)
      resetTime = requests[0].timestamp + config.windowMs
    }

    return {
      isRateLimited,
      currentCount: requests.length,
      maxRequests: config.maxRequests,
      resetTime,
      remainingRequests: Math.max(0, config.maxRequests - requests.length),
    }
  },
})

/**
 * Record a request for rate limiting
 * @param identifier Unique identifier for the requester
 * @param action The action being rate limited
 * @returns The created rate limit record ID
 */
export const recordRequest = internalMutation({
  args: {
    identifier: v.string(),
    action: v.string(),
  },
  handler: async (ctx, args) => {
    const { identifier, action } = args
    const now = Date.now()

    // Record this request
    const id = await ctx.db.insert("rateLimits", {
      identifier,
      action,
      timestamp: now,
    })

    // Clean up old records (optional, but helps keep the table size manageable)
    // This is a background task that doesn't affect the response time
    const oneDayAgo = now - 24 * 60 * 60 * 1000
    const oldRecords = await ctx.db
      .query("rateLimits")
      .withIndex("by_timestamp", (q) => q.lt("timestamp", oneDayAgo))
      .collect()

    for (const record of oldRecords) {
      await ctx.db.delete(record._id)
    }

    return id
  },
})

/**
 * Apply rate limiting to a request
 * This is a helper function that combines checking and recording
 * @param identifier Unique identifier for the requester
 * @param action The action being rate limited
 * @param config Rate limit configuration
 * @returns Rate limit information
 * @throws ConvexError if rate limited
 */
export const applyRateLimit = mutation({
  args: {
    identifier: v.string(),
    action: v.string(),
    config: v.object({
      maxRequests: v.number(),
      windowMs: v.number(),
      message: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const { identifier, action, config } = args

    // Check if rate limited
    const rateLimit = await ctx.runQuery(checkRateLimit, {
      identifier,
      action,
      config: {
        maxRequests: config.maxRequests,
        windowMs: config.windowMs,
      },
    })

    if (rateLimit.isRateLimited) {
      // Calculate seconds until reset
      const secondsUntilReset = Math.ceil((rateLimit.resetTime - Date.now()) / 1000)

      throw new ConvexError(config.message || `Rate limit exceeded. Try again in ${secondsUntilReset} seconds.`)
    }

    // Record this request
    await ctx.runMutation(recordRequest, {
      identifier,
      action,
    })

    return {
      success: true,
      remaining: rateLimit.remainingRequests - 1,
      limit: config.maxRequests,
      reset: rateLimit.resetTime,
    }
  },
})

/**
 * Get current rate limit status without recording a request
 * Useful for displaying rate limit information to users
 */
export const getRateLimitStatus = query({
  args: {
    identifier: v.string(),
    action: v.string(),
    config: v.object({
      maxRequests: v.number(),
      windowMs: v.number(),
    }),
  },
  handler: async (ctx, args) => {
    return await ctx.runQuery(checkRateLimit, args)
  },
})
