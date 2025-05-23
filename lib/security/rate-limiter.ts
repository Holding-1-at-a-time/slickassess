import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/http"
import { api } from "@/convex/_generated/api"
import { logger } from "@/lib/logging/logger"

// Rate limit configuration type
export type RateLimitConfig = {
  identifier?: string
  action: string
  maxRequests: number
  windowMs: number
  message?: string
}

// Default configurations for different actions
const DEFAULT_CONFIGS: Record<string, Omit<RateLimitConfig, "identifier" | "action">> = {
  api: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
    message: "Too many requests, please try again later.",
  },
  auth: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
    message: "Too many authentication attempts, please try again later.",
  },
  upload: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
    message: "Too many upload attempts, please try again later.",
  },
}

// Initialize Convex client
const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "")

// Token bucket algorithm implementation using Convex
export async function checkRateLimit(config: RateLimitConfig): Promise<{
  allowed: boolean
  remaining: number
  resetAt: number
}> {
  try {
    const { identifier, action, maxRequests, windowMs } = config

    if (!identifier) {
      logger.warn({ message: "Rate limit check without identifier", action })
      return { allowed: true, remaining: maxRequests, resetAt: Date.now() + windowMs }
    }

    // Call Convex function to check and update rate limit
    const result = await convexClient.mutation(api.rateLimiter.checkRateLimit, {
      identifier,
      action,
      maxTokens: maxRequests,
      refillTimeMs: windowMs,
      tokensToConsume: 1,
    })

    return {
      allowed: result.allowed,
      remaining: result.remainingTokens,
      resetAt: result.resetAt,
    }
  } catch (error) {
    // Log error but don't block the request on rate limiter failure
    logger.error({
      message: "Rate limit check failed",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Fail open - allow the request if the rate limiter fails
    return { allowed: true, remaining: 0, resetAt: Date.now() }
  }
}

// Middleware for Next.js API routes
export function withRateLimit(actionType: keyof typeof DEFAULT_CONFIGS) {
  return async (req: NextRequest): Promise<NextResponse | undefined> => {
    // Get client IP for rate limiting
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown"

    // Get default config for this action type
    const defaultConfig = DEFAULT_CONFIGS[actionType]

    // Check rate limit
    const result = await checkRateLimit({
      identifier: clientIp,
      action: actionType,
      ...defaultConfig,
    })

    // If rate limit exceeded, return 429 response
    if (!result.allowed) {
      const response = NextResponse.json({ error: defaultConfig.message || "Rate limit exceeded" }, { status: 429 })

      // Add rate limit headers
      response.headers.set("X-RateLimit-Limit", defaultConfig.maxRequests.toString())
      response.headers.set("X-RateLimit-Remaining", result.remaining.toString())
      response.headers.set("X-RateLimit-Reset", result.resetAt.toString())
      response.headers.set("Retry-After", Math.ceil((result.resetAt - Date.now()) / 1000).toString())

      return response
    }

    // Otherwise, continue to the next middleware/handler
    return undefined
  }
}

// Direct rate limit function for server actions or other contexts
export async function rateLimit(options: {
  identifier: string
  limit: number
  timeframe: number // in seconds
  action?: string
}): Promise<{ success: boolean; remaining: number; resetAt: number }> {
  const { identifier, limit, timeframe, action = "default" } = options

  const result = await checkRateLimit({
    identifier,
    action,
    maxRequests: limit,
    windowMs: timeframe * 1000,
  })

  return {
    success: result.allowed,
    remaining: result.remaining,
    resetAt: result.resetAt,
  }
}
