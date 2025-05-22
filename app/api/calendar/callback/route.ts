import { NextResponse } from "next/server"
import { google } from "googleapis"
import { requireEnv } from "../../../utils/env"
import { ConvexHttpClient } from "convex/http"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const code = searchParams.get("code")
  const stateStr = searchParams.get("state")
  if (!code || !stateStr) {
    return NextResponse.json({ error: "Missing code or state" }, { status: 400 })
  }

  let state
  try {
    state = JSON.parse(stateStr)
  } catch (error) {
    return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 })
  }

  const { userId, orgId } = state
  if (!userId || !orgId) {
    return NextResponse.json({ error: "Missing userId or orgId in state" }, { status: 400 })
  }

  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`
  const clientId = requireEnv("GOOGLE_CLIENT_ID")
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET")
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

  try {
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    const accessToken = tokens.access_token!
    const refreshToken = tokens.refresh_token!
    const expiryDate = tokens.expiry_date! // in ms

    // Persist tokens to Convex
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!
    const convexAdminKey = process.env.CONVEX_ADMIN_KEY!
    const client = new ConvexHttpClient(convexUrl, convexAdminKey)

    // Upsert calendarIntegration record
    await client.mutation("calendarIntegration.upsert", {
      userId,
      orgId,
      provider: "google",
      accessToken,
      refreshToken,
      tokenExpiry: expiryDate,
      calendarId: "primary", // Default to primary calendar
      syncEnabled: true,
      lastSynced: null,
    })

    // Redirect back to calendar page
    return NextResponse.redirect(`${process.env.NEXT_PUBLIC_APP_URL}/calendar`)
  } catch (error) {
    console.error("Error exchanging code for tokens:", error)
    return NextResponse.json({ error: "Failed to exchange code for tokens" }, { status: 500 })
  }
}
