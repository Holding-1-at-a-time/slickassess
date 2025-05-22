import { v } from "convex/values"
import { query } from "../_generated/server"

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
  // Lead creation - 5 submissions per minute
  create_lead_assessment: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 1 minute
    message: "Too many lead submissions. Please try again later.",
  },
  // Bulk operations - 10 per minute per user
  bulk_convert_leads: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    message: "Too many bulk operations. Please try again later.",
  },
  bulk_delete_leads: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    message: "Too many bulk operations. Please try again later.",
  },
}

/**
 * Check if a request should be rate limited
 * @param ctx Convex context
 * @param identifier Unique identifier for the requester (IP address, user ID, etc.)
 * @param action The action being rate limited
 * @param maxRequests Maximum number of requests allowed in the time window
 * @param windowMs Time window in milliseconds
 * @returns True if rate limited, false otherwise
 */
export async function checkRateLimit(
  ctx: any,
  identifier: string,
  action: string,
  maxRequests: number,
  windowMs: number,
) {
  const now = Date.now()
  const windowStart = now - windowMs

  // Get recent requests for this identifier and action
  const requests = await ctx.db
    .query("rateLimits")
    .withIndex("by_identifier_action_timestamp", (q) =>
      q.eq("identifier", identifier).eq("action", action).gt("timestamp", windowStart),
    )
    .collect()

  // Check if rate limit is exceeded
  return requests.length >= maxRequests
}

/**
 * Record a request for rate limiting
 * @param ctx Convex context
 * @param identifier Unique identifier for the requester
 * @param action The action being rate limited
 */
export async function recordRequest(ctx: any, identifier: string, action: string) {
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
    .take(100)
    .collect()

  for (const record of oldRecords) {
    await ctx.db.delete(record._id)
  }

  return id
}

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
