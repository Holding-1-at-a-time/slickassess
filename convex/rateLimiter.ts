import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

// Token bucket algorithm implementation
export const checkRateLimit = mutation({
  args: {
    identifier: v.string(),
    action: v.string(),
    maxTokens: v.number(),
    refillTimeMs: v.number(),
    tokensToConsume: v.number(),
  },
  handler: async (ctx, args) => {
    const { identifier, action, maxTokens, refillTimeMs, tokensToConsume } = args

    // Get current timestamp
    const now = Date.now()

    // Try to get existing rate limit record
    const rateLimitKey = `${identifier}:${action}`
    const existingLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_identifier_action", (q) => q.eq("identifier", identifier).eq("action", action))
      .first()

    if (!existingLimit) {
      // First request, create new record with max tokens minus consumed
      await ctx.db.insert("rateLimits", {
        identifier,
        action,
        tokens: maxTokens - tokensToConsume,
        lastRefill: now,
        createdAt: now,
        updatedAt: now,
      })

      return {
        allowed: true,
        remainingTokens: maxTokens - tokensToConsume,
        resetAt: now + refillTimeMs,
      }
    }

    // Calculate token refill based on time elapsed
    const timeElapsed = now - existingLimit.lastRefill
    const tokensToAdd = Math.floor((timeElapsed / refillTimeMs) * maxTokens)

    // Calculate new token count
    let newTokens = Math.min(existingLimit.tokens + tokensToAdd, maxTokens)

    // Check if we have enough tokens
    if (newTokens < tokensToConsume) {
      // Not enough tokens, calculate reset time
      const tokensNeeded = tokensToConsume - newTokens
      const timeToRefill = Math.ceil((tokensNeeded / maxTokens) * refillTimeMs)
      const resetAt = now + timeToRefill

      return {
        allowed: false,
        remainingTokens: newTokens,
        resetAt,
      }
    }

    // Consume tokens
    newTokens -= tokensToConsume

    // Update the record
    await ctx.db.patch(existingLimit._id, {
      tokens: newTokens,
      lastRefill: now,
      updatedAt: now,
    })

    return {
      allowed: true,
      remainingTokens: newTokens,
      resetAt: now + refillTimeMs,
    }
  },
})

// Get current rate limit status without consuming tokens
export const getRateLimitStatus = query({
  args: {
    identifier: v.string(),
    action: v.string(),
    maxTokens: v.number(),
    refillTimeMs: v.number(),
  },
  handler: async (ctx, args) => {
    const { identifier, action, maxTokens, refillTimeMs } = args

    // Get current timestamp
    const now = Date.now()

    // Try to get existing rate limit record
    const existingLimit = await ctx.db
      .query("rateLimits")
      .withIndex("by_identifier_action", (q) => q.eq("identifier", identifier).eq("action", action))
      .first()

    if (!existingLimit) {
      return {
        remainingTokens: maxTokens,
        resetAt: now,
      }
    }

    // Calculate token refill based on time elapsed
    const timeElapsed = now - existingLimit.lastRefill
    const tokensToAdd = Math.floor((timeElapsed / refillTimeMs) * maxTokens)

    // Calculate current token count
    const currentTokens = Math.min(existingLimit.tokens + tokensToAdd, maxTokens)

    return {
      remainingTokens: currentTokens,
      resetAt:
        currentTokens < maxTokens ? now + Math.ceil(((maxTokens - currentTokens) / maxTokens) * refillTimeMs) : now,
    }
  },
})

// Clean up expired rate limit records (can be run as a scheduled job)
export const cleanupExpiredRateLimits = mutation({
  args: {
    olderThanMs: v.number(),
  },
  handler: async (ctx, args) => {
    const { olderThanMs } = args
    const cutoffTime = Date.now() - olderThanMs

    // Get all rate limit records
    const allLimits = await ctx.db.query("rateLimits").collect()

    let deletedCount = 0

    // Check each record
    for (const limit of allLimits) {
      // If last update is older than cutoff and has max tokens, delete it
      if (limit.updatedAt < cutoffTime) {
        await ctx.db.delete(limit._id)
        deletedCount++
      }
    }

    return { deletedCount }
  },
})
