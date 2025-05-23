import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { GoogleCalendarService } from "@/lib/calendar/google-calendar-service"

export async function POST(req: Request) {
  try {
    const { userId, orgId, getToken } = auth()
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })
    if (!orgId) return new NextResponse("No organization selected", { status: 400 })

    // Get auth token for Convex
    const authToken = await getToken({ template: "convex" })

    // Initialize calendar service
    const calendarService = new GoogleCalendarService(process.env.NEXT_PUBLIC_CONVEX_URL!, authToken)

    // Parse request body for sync options
    const body = await req.json().catch(() => ({}))
    const syncOptions = {
      startDate: body.startDate ? new Date(body.startDate) : undefined,
      endDate: body.endDate ? new Date(body.endDate) : undefined,
      maxResults: body.maxResults || 250,
    }

    // Sync events
    const result = await calendarService.syncEvents(userId, syncOptions)

    return NextResponse.json(result)
  } catch (error) {
    console.error("Error syncing calendar:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to sync calendar",
        message: "An unexpected error occurred. Please try again later.",
      },
      { status: 500 },
    )
  }
}
