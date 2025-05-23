import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { AnalyticsDashboard } from "@/lib/analytics/analytics-dashboard"
import { withRateLimit } from "@/lib/security/rate-limiter"
import { handleApiError, errors } from "@/lib/error-handling"
import { withApiLogger } from "@/lib/logging/api-logger"
import { logger } from "@/lib/logging/logger"

// Apply rate limiting middleware
const rateLimit = withRateLimit("api")

export async function GET(request: NextRequest) {
  return withApiLogger(request, async (req) => {
    try {
      // Apply rate limiting
      const rateLimitResult = await rateLimit(req)
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

      // Validate NEXT_PUBLIC_CONVEX_URL environment variable
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
      if (!convexUrl) {
        throw errors.internal("Environment variable NEXT_PUBLIC_CONVEX_URL is not defined")
      }

      // Initialize analytics dashboard
      const dashboard = new AnalyticsDashboard(convexUrl, authToken)

      // Parse query parameters
      const url = new URL(request.url)
      const endpoint = url.searchParams.get("endpoint") || "dashboard"
      const timeRange = (url.searchParams.get("timeRange") as any) || "30d"
      const format = url.searchParams.get("format") || "json"

      let data: any = {}

      switch (endpoint) {
        case "dashboard":
          data = await dashboard.getDashboardData(orgId, timeRange)
          break

        case "export":
          const exportData = await dashboard.exportData(orgId, format as "csv" | "json", timeRange)

          if (format === "csv") {
            return new NextResponse(exportData, {
              headers: {
                "Content-Type": "text/csv",
                "Content-Disposition": `attachment; filename="analytics-${orgId}-${new Date().toISOString().split("T")[0]}.csv"`,
              },
            })
          }

          return new NextResponse(exportData, {
            headers: {
              "Content-Type": "application/json",
              "Content-Disposition": `attachment; filename="analytics-${orgId}-${new Date().toISOString().split("T")[0]}.json"`,
            },
          })

        default:
          throw errors.badRequest("Invalid endpoint")
      }

      logger.info({
        message: "Analytics data retrieved successfully",
        userId,
        orgId,
        endpoint,
        timeRange,
      })

      return NextResponse.json({
        success: true,
        endpoint,
        orgId,
        timeRange,
        timestamp: new Date().toISOString(),
        data,
      })
    } catch (error) {
      return handleApiError(error, "Error retrieving analytics data")
    }
  })
}
