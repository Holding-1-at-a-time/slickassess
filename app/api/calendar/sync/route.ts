import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { GoogleCalendarService } from "@/lib/calendar/google-calendar-service"
import { handleApiError, errors } from "@/lib/error-handling"
import { withApiLogger } from "@/lib/logging/api-logger"
import { withRateLimit } from "@/lib/security/rate-limiter"
import { logger } from "@/lib/logging/logger"
import { z } from "zod"

// Apply rate limiting middleware
const rateLimit = withRateLimit("api")

// Define request body schema
const syncOptionsSchema = z.object({
  startDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  endDate: z
    .string()
    .optional()
    .transform((val) => (val ? new Date(val) : undefined)),
  maxResults: z.number().int().positive().max(1000).default(250),
})

export async function POST(req: NextRequest) {
  return withApiLogger(req, async (request) => {
    try {
      // Apply rate limiting
      const rateLimitResult = await rateLimit(request)
      if (rateLimitResult) {
        return rateLimitResult
      }

      // Authenticate the request
      const { userId, orgId, getToken } = auth()
      if (!userId) {
        throw errors.unauthorized("Authentication required")
      }

      if (!orgId) {
        throw errors.badRequest("No organization selected")
      }

      // Get auth token for Convex
      const authToken = await getToken({ template: "convex" })

      // Validate NEXT_PUBLIC_CONVEX_URL before use
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
      if (!convexUrl) {
        throw errors.internal("Missing environment variable: NEXT_PUBLIC_CONVEX_URL")
      }

      // Initialize calendar service
      const calendarService = new GoogleCalendarService(convexUrl, authToken)

      // Parse and validate request body
      let body
      try {
        body = await request.json()
      } catch (err) {
        throw errors.badRequest("Invalid JSON in request body")
      }

      // Validate with Zod schema
      const validationResult = syncOptionsSchema.safeParse(body)
      if (!validationResult.success) {
        throw errors.badRequest("Invalid request parameters", {
          details: validationResult.error.format(),
        })
      }

      const syncOptions = validationResult.data

      // Log sync attempt
      logger.info({
        message: "Calendar sync initiated",
        userId,
        orgId,
        startDate: syncOptions.startDate?.toISOString(),
        endDate: syncOptions.endDate?.toISOString(),
        maxResults: syncOptions.maxResults,
      })

      // Sync events
      const result = await calendarService.syncEvents(userId, syncOptions)

      // Log sync result
      logger.info({
        message: "Calendar sync completed",
        userId,
        orgId,
        eventsProcessed: result.eventsProcessed,
        eventsAdded: result.eventsAdded,
        eventsUpdated: result.eventsUpdated,
      })

      return NextResponse.json(result)
    } catch (error) {
      return handleApiError(error, "Failed to sync calendar")
    }
  })
}
