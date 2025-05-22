import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { ConvexHttpClient } from "convex/http"
import { api } from "@/convex/_generated/api"
import { queryAppointmentsPerDay, queryRevenuePerMonth } from "@/lib/analytics/bigquery"

// Initialize Convex client
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || ""
const convexAdminKey = process.env.CONVEX_ADMIN_KEY || ""
const convexClient = new ConvexHttpClient(convexUrl, convexAdminKey)

export async function GET() {
  try {
    // Authenticate the request
    const { userId, orgId } = auth()
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })
    if (!orgId) return new NextResponse("No organization selected", { status: 400 })

    // Check if BigQuery is configured
    const useRealBigQuery = process.env.GCP_CREDENTIALS_JSON && process.env.GCP_PROJECT_ID

    let appointmentsPerDay
    let revenuePerMonth

    if (useRealBigQuery) {
      // Use real BigQuery queries
      appointmentsPerDay = await queryAppointmentsPerDay(orgId)
      revenuePerMonth = await queryRevenuePerMonth(orgId)
    } else {
      // Use Convex as a fallback
      appointmentsPerDay = await convexClient.query(api.analytics.getAppointmentsPerDay, { orgId })
      revenuePerMonth = await convexClient.query(api.analytics.getRevenuePerMonth, { orgId })
    }

    // Return the metrics
    return NextResponse.json({
      appointmentsPerDay,
      revenuePerMonth,
    })
  } catch (error) {
    console.error("Error fetching metrics:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
