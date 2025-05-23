import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { GoogleCalendarService } from "@/lib/calendar/google-calendar-service"

export async function GET(req: Request) {
  try {
    const { userId, orgId } = auth()
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })
    if (!orgId) return new NextResponse("No organization selected", { status: 400 })

    // Initialize calendar service
    const calendarService = new GoogleCalendarService(process.env.NEXT_PUBLIC_CONVEX_URL!)

    // Generate authorization URL
    const authUrl = calendarService.generateAuthUrl(userId, orgId)

    return NextResponse.redirect(authUrl)
  } catch (error) {
    console.error("Error connecting to Google Calendar:", error)
    return NextResponse.json({ error: "Failed to connect to Google Calendar" }, { status: 500 })
  }
}
