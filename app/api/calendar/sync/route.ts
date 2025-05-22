import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { google } from "googleapis"
import { ConvexHttpClient } from "convex/http"
import { requireEnv } from "../../../utils/env"

export async function POST(req: Request) {
  const { userId, orgId, getToken } = auth()
  if (!userId) return new NextResponse("Unauthorized", { status: 401 })
  if (!orgId) return new NextResponse("No organization selected", { status: 400 })

  try {
    const token = await getToken({ template: "convex" })
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!
    const client = new ConvexHttpClient(convexUrl)

    // Set the auth token for the request
    client.setAuth(token)

    // Get the calendar integration for this user
    const integration = await client.query("calendarIntegration.getByUserId", { userId })
    if (!integration) {
      return NextResponse.json({ error: "No calendar integration found" }, { status: 404 })
    }

    // Set up Google OAuth client
    const clientId = requireEnv("GOOGLE_CLIENT_ID")
    const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET")
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`

    const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

    // Set credentials
    oauth2Client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken,
      expiry_date: integration.tokenExpiry,
    })

    // Check if token is expired and refresh if needed
    if (Date.now() >= integration.tokenExpiry) {
      const { credentials } = await oauth2Client.refreshAccessToken()

      // Update tokens in database
      await client.mutation("calendarIntegration.upsert", {
        userId,
        orgId,
        provider: "google",
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || integration.refreshToken,
        tokenExpiry: credentials.expiry_date!,
        calendarId: integration.calendarId,
        syncEnabled: integration.syncEnabled,
        lastSynced: integration.lastSynced,
      })

      // Update oauth client with new tokens
      oauth2Client.setCredentials({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token || integration.refreshToken,
        expiry_date: credentials.expiry_date,
      })
    }

    // Get events from Google Calendar
    const calendar = google.calendar({ version: "v3", auth: oauth2Client })
    const now = new Date()
    const oneMonthFromNow = new Date()
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1)

    const response = await calendar.events.list({
      calendarId: integration.calendarId,
      timeMin: now.toISOString(),
      timeMax: oneMonthFromNow.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    })

    const events = response.data.items || []

    // Sync events to our database
    for (const event of events) {
      if (event.id && event.summary) {
        await client.mutation("calendarEvents.upsertEvent", {
          integrationId: integration._id,
          externalId: event.id,
          title: event.summary,
          description: event.description || undefined,
          startTime: event.start?.dateTime
            ? new Date(event.start.dateTime).getTime()
            : event.start?.date
              ? new Date(event.start.date).getTime()
              : Date.now(),
          endTime: event.end?.dateTime
            ? new Date(event.end.dateTime).getTime()
            : event.end?.date
              ? new Date(event.end.date).getTime()
              : Date.now() + 3600000,
          location: event.location || undefined,
          attendees: event.attendees?.map((a) => a.email || "") || undefined,
        })
      }
    }

    // Update last synced timestamp
    await client.mutation("calendarIntegration.updateLastSynced", {
      integrationId: integration._id,
    })

    return NextResponse.json({
      success: true,
      message: "Calendar synced successfully",
      eventCount: events.length,
    })
  } catch (error) {
    console.error("Error syncing calendar:", error)
    return NextResponse.json({ error: "Failed to sync calendar" }, { status: 500 })
  }
}
