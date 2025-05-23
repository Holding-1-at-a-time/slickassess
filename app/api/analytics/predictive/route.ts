import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { forecastAppointments, forecastRevenue, predictCustomerChurn } from "@/lib/analytics/predictive-analytics"

export async function GET(request: Request) {
  try {
    // Authenticate the request
    const { userId, orgId } = auth()
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })
    if (!orgId) return new NextResponse("No organization selected", { status: 400 })

    // Parse query parameters
    const url = new URL(request.url)
    const type = url.searchParams.get("type") || "appointments"
    const clientId = url.searchParams.get("clientId")

    // Handle different prediction types
    let result

    switch (type) {
      case "appointments":
        const days = Number.parseInt(url.searchParams.get("days") || "30", 10)
        const forecastDays = Number.parseInt(url.searchParams.get("forecastDays") || "14", 10)
        result = await forecastAppointments(orgId, days, forecastDays)
        break

      case "revenue":
        const months = Number.parseInt(url.searchParams.get("months") || "12", 10)
        const forecastMonths = Number.parseInt(url.searchParams.get("forecastMonths") || "3", 10)
        result = await forecastRevenue(orgId, months, forecastMonths)
        break

      case "churn":
        if (!clientId) {
          return new NextResponse("Client ID is required for churn prediction", { status: 400 })
        }
        result = await predictCustomerChurn(orgId, clientId)
        break

      default:
        return new NextResponse("Invalid prediction type", { status: 400 })
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error in predictive analytics:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
