import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { AnalyticsDashboard } from "@/lib/analytics/analytics-dashboard"
import { withRateLimit } from "@/lib/security/rate-limiter"

// Apply rate limiting middleware
const rateLimit = withRateLimit("api")

export async function GET(request: Request) {
  try {
    // Apply rate limiting
    const rateLimitResult = await rateLimit(request)
    if (rateLimitResult.status === 429) {
      return rateLimitResult
    }

    // Authenticate the request
    const { userId, orgId, getToken } = auth()
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })
    if (!orgId) return new NextResponse("No organization selected", { status: 400 })

    // Get auth token for Convex
    const authToken = await getToken({ template: "convex" })

    // Initialize analytics dashboard
    const dashboard = new AnalyticsDashboard(process.env.NEXT_PUBLIC_CONVEX_URL!, authToken)

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
        return NextResponse.json({ error: "Invalid endpoint" }, { status: 400 })
    }

    return NextResponse.json({
      success: true,
      endpoint,
      orgId,
      timeRange,
      timestamp: new Date().toISOString(),
      data,
    })
  } catch (error) {
    console.error("Error in analytics API:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
