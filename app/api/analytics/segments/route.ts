import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import {
  getCustomerMetrics,
  getCustomerSegment,
  getSegmentDetails,
  getSegmentDistribution,
  getCustomersInSegment,
  type CustomerSegment,
} from "@/lib/analytics/customer-segmentation"
import { ConvexHttpClient } from "convex/http"
import { api } from "@/convex/_generated/api"

// Initialize Convex client
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || ""
const convexAdminKey = process.env.CONVEX_ADMIN_KEY || ""
const convexClient = new ConvexHttpClient(convexUrl, convexAdminKey)

export async function GET(request: Request) {
  try {
    // Authenticate the request
    const { userId, orgId } = auth()
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })
    if (!orgId) return new NextResponse("No organization selected", { status: 400 })

    // Parse query parameters
    const url = new URL(request.url)
    const action = url.searchParams.get("action") || "distribution"
    const clientId = url.searchParams.get("clientId")
    const segment = url.searchParams.get("segment") as CustomerSegment | null

    // Handle different actions
    switch (action) {
      case "client":
        if (!clientId) {
          return new NextResponse("Client ID is required", { status: 400 })
        }

        // Get customer metrics
        const metrics = await getCustomerMetrics(orgId, clientId)

        // Get customer segment
        const customerSegment = getCustomerSegment(metrics)

        // Get segment details
        const segmentDetails = getSegmentDetails(customerSegment)

        // Get client details from Convex
        const client = await convexClient.query(api.clients.getById, { clientId })

        return NextResponse.json({
          clientId,
          clientName: client?.name || "Unknown Client",
          metrics,
          segment: customerSegment,
          segmentDetails,
        })

      case "distribution":
        // Get segment distribution
        const distribution = await getSegmentDistribution(orgId)
        return NextResponse.json(distribution)

      case "segment":
        if (!segment) {
          return new NextResponse("Segment is required", { status: 400 })
        }

        // Get customers in segment
        const customers = await getCustomersInSegment(orgId, segment)

        // Get client details from Convex
        const clientDetails = await Promise.all(
          customers.map(async (customer) => {
            const client = await convexClient.query(api.clients.getById, { clientId: customer.clientId })
            return {
              ...customer,
              name: client?.name || "Unknown Client",
              email: client?.email || "",
              phone: client?.phone || "",
            }
          }),
        )

        return NextResponse.json(clientDetails)

      default:
        return new NextResponse("Invalid action", { status: 400 })
    }
  } catch (error) {
    console.error("Error in customer segmentation:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
