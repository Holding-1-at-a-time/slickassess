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

    // Validate NEXT_PUBLIC_CONVEX_URL before use
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL
    if (!convexUrl) {
      throw new Error("Missing environment variable: NEXT_PUBLIC_CONVEX_URL")
    }
    // Initialize calendar service
    const calendarService = new GoogleCalendarService(convexUrl, authToken)

    // Parse request body for sync options
    let body
    try {
      body = await req.json()
    } catch (err) {
      return new NextResponse("Invalid JSON in request body", { status: 400 })
    }
    // Validate and parse startDate and endDate
    let startDate: Date | undefined = undefined;
    let endDate: Date | undefined = undefined;

    if (body.startDate) {
      const parsedStart = new Date(body.startDate);
      if (!isNaN(parsedStart.getTime())) {
        startDate = parsedStart;
      }
    }

    if (body.endDate) {
      const parsedEnd = new Date(body.endDate);
      if (!isNaN(parsedEnd.getTime())) {
        endDate = parsedEnd;
      }
    }

    const syncOptions = {
      startDate,
      endDate,
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
