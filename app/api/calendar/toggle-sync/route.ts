import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { ConvexHttpClient } from "convex/http"

export async function POST(req: Request) {
  const { userId, orgId, getToken } = auth()
  if (!userId) return new NextResponse("Unauthorized", { status: 401 })
  if (!orgId) return new NextResponse("No organization selected", { status: 400 })

  try {
    const { integrationId, enabled } = await req.json()
    if (!integrationId) {
      return NextResponse.json({ error: "Missing integrationId" }, { status: 400 })
    }

    const token = await getToken({ template: "convex" })
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!
    const client = new ConvexHttpClient(convexUrl)

    // Set the auth token for the request
    client.setAuth(token)

    // Toggle sync enabled
    await client.mutation("calendarIntegration.toggleSyncEnabled", {
      integrationId,
      enabled,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error toggling sync:", error)
    return NextResponse.json({ error: "Failed to toggle sync" }, { status: 500 })
  }
}
