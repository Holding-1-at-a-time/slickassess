import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { rateLimit } from "@/convex/utils/rate-limiter"

// Initialize Convex client
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const { userId, orgId } = auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimit({
      identifier: `save_report_${userId}`,
      limit: 50,
      timeframe: 60 * 60, // 1 hour
    })

    if (!rateLimitResult.success) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 })
    }

    // Parse request body
    const body = await req.json()
    const { assessmentData, vehicleId, assessmentId, customerId, reportNumber, generatedDate } = body

    if (!assessmentData || !vehicleId) {
      return NextResponse.json({ error: "Assessment data and vehicle ID are required" }, { status: 400 })
    }

    // Save report to Convex database
    const reportId = await convex.mutation(api.reports.saveAssessmentReport, {
      orgId,
      userId,
      vehicleId,
      assessmentId: assessmentId || null,
      customerId: customerId || null,
      reportNumber,
      generatedDate,
      assessmentData,
      status: "active",
      shareEnabled: false,
    })

    // Return success response with report ID
    return NextResponse.json({
      success: true,
      message: "Assessment report saved successfully",
      reportId,
    })
  } catch (error) {
    console.error("Error saving report:", error)
    return NextResponse.json({ error: "Failed to save report" }, { status: 500 })
  }
}
