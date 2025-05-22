import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

// Create a Convex client for server-side API calls
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: Request) {
  // Ensure authenticated
  const { userId, orgId } = auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!orgId) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 })
  }

  try {
    // Parse JSON body
    const { imageUrl, vehicleId, assessmentId, category, position, tags } = await req.json()

    if (!imageUrl) {
      return NextResponse.json({ error: "Image URL is required" }, { status: 400 })
    }

    // Get a JWT token for Convex authentication
    const token = await auth().getToken({ template: "convex" })

    if (!token) {
      return NextResponse.json({ error: "Failed to generate authentication token" }, { status: 500 })
    }

    // Call the Convex mutation to store the image metadata
    const imageId = await convex.mutation(
      api.images.createImage,
      {
        imageUrl,
        vehicleId: vehicleId || null,
        assessmentId: assessmentId || null,
        category: category || "general",
        position: position || null,
        tags: tags || [],
      },
      { authorization: `Bearer ${token}` },
    )

    return NextResponse.json({
      success: true,
      id: imageId,
      message: "Image uploaded successfully",
    })
  } catch (error: any) {
    console.error("Error uploading image:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to process image upload",
      },
      {
        status: 500,
      },
    )
  }
}
