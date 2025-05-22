import { NextResponse } from "next/server"
import { google } from "googleapis"
import { ConvexHttpClient } from "convex/http"
import { requireEnv } from "../../../../utils/env"

export async function GET(req: Request) {
  // Verify cron secret for security
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get("secret")
  const cronSecret = requireEnv("CRON_SECRET")

  if (secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    // Initialize Convex client with admin key
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!
    const convexAdminKey = requireEnv("CONVEX_ADMIN_KEY")
    const client = new ConvexHttpClient(convexUrl, convexAdminKey)

    // Get all active calendar integrations
    const integrations = await client.query("admin.getAllActiveCalendarIntegrations")

    let successCount = 0
    let errorCount = 0

    // Set up Google OAuth client
    const clientId = requireEnv("GOOGLE_CLIENT_ID")
    const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET")
    const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`

    // Process each integration
    for (const integration of integrations) {
      try {
        if (!integration.syncEnabled) continue

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
            userId: integration.userId,
            orgId: integration.orgId,
            provider: integration.provider,
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

        successCount++
      } catch (error) {
        console.error(`Error syncing calendar for integration ${integration._id}:`, error)
        errorCount++
      }
    }

    return NextResponse.json({
      success: true,
      message: "Calendar sync job completed",
      stats: {
        total: integrations.length,
        success: successCount,
        error: errorCount,
      },
    })
  } catch (error) {
    console.error("Error in calendar sync cron job:", error)
    return NextResponse.json({ error: "Failed to run calendar sync job" }, { status: 500 })
  }
}
