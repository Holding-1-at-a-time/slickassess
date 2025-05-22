import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { google } from "googleapis"
import { requireEnv } from "../../../utils/env"

export async function GET(req: Request) {
  const { userId, orgId } = auth()
  if (!userId) return new NextResponse("Unauthorized", { status: 401 })
  if (!orgId) return new NextResponse("No organization selected", { status: 400 })

  // Generate Google OAuth URL
  const redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`
  const clientId = requireEnv("GOOGLE_CLIENT_ID")
  const clientSecret = requireEnv("GOOGLE_CLIENT_SECRET")

  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret, redirectUri)

  const url = oauth2Client.generateAuthUrl({
    access_type: "offline",
    scope: ["https://www.googleapis.com/auth/calendar.events", "https://www.googleapis.com/auth/calendar.readonly"],
    state: JSON.stringify({ userId, orgId }),
    prompt: "consent", // Force to show the consent screen to get refresh token
  })

  return NextResponse.redirect(url)
}
