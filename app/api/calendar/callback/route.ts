import { NextResponse } from "next/server"
import { GoogleCalendarService } from "@/lib/calendar/google-calendar-service"

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    // Check for errors in the callback
    if (error) {
      console.error("Google Calendar authorization error:", error)
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/calendar?error=${error}`)
    }

    // Validate required parameters
    if (!code || !state) {
      console.error("Missing required parameters in Google Calendar callback")
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/calendar?error=missing_params`)
    }

    // Initialize calendar service
    const calendarService = new GoogleCalendarService(process.env.NEXT_PUBLIC_CONVEX_URL!)

    // Exchange code for tokens
    const result = await calendarService.exchangeCodeForTokens(code, state)

    if (result.success) {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/calendar?success=true`)
    } else {
      return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/calendar?error=exchange_failed`)
    }
  } catch (error) {
    console.error("Error in calendar callback:", error)
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/calendar?error=server_error`)
  }
}
