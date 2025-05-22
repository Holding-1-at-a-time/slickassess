import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { ConvexHttpClient } from "convex/http"

export async function GET(req: Request) {
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

    return NextResponse.json({ integration })
  } catch (error) {
    console.error("Error fetching calendar status:", error)
    return NextResponse.json({ error: "Failed to fetch calendar status" }, { status: 500 })
  }
}
