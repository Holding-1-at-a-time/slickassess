import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { rateLimit } from "@/convex/utils/rate-limiter"

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(req: NextRequest) {
  try {
    // Check authentication
    const { userId, orgId } = auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimit({
      identifier: `share_link_${userId}`,
      limit: 50,
      timeframe: 60 * 60, // 1 hour
    })

    if (!rateLimitResult.success) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 })
    }

    // Get report ID from query params
    const reportId = req.nextUrl.searchParams.get("reportId")
    if (!reportId) {
      return NextResponse.json({ error: "Report ID is required" }, { status: 400 })
    }

    // Generate a unique share token
    const shareToken = `${reportId}_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`

    // Update the report in the database to enable sharing and store the token
    await convex.mutation(api.reports.enableReportSharing, {
      reportId,
      shareToken,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days expiry
    })

    // Generate the shareable URL
    const shareLink = `${process.env.NEXT_PUBLIC_APP_URL}/reports/shared/${shareToken}`

    // Return the shareable link
    return NextResponse.json({
      success: true,
      shareLink,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    })
  } catch (error) {
    console.error("Error generating share link:", error)
    return NextResponse.json({ error: "Failed to generate share link" }, { status: 500 })
  }
}
