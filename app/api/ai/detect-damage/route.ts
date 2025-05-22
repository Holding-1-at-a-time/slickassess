import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { v4 as uuidv4 } from "uuid"
import { analyzeVehicleImage } from "@/lib/ai/vehicle-damage-ai"
import { rateLimiter } from "@/lib/rate-limiter"

// Create a Convex client for server-side API calls
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// Define damage types and their corresponding colors and severities
const DAMAGE_TYPES = {
  scratch: { color: "#ff0000", severity: "minor" },
  dent: { color: "#ff6600", severity: "moderate" },
  crack: { color: "#ff00ff", severity: "moderate" },
  rust: { color: "#8b4513", severity: "severe" },
  broken: { color: "#ff0000", severity: "severe" },
  missing: { color: "#000000", severity: "severe" },
}

export async function POST(req: Request) {
  // Ensure authenticated
  const { userId, orgId } = auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!orgId) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 })
  }

  // Apply rate limiting - 20 requests per hour per organization
  const rateLimited = await rateLimiter.limit(`org_${orgId}_ai_damage_detection`, 20, 60 * 60)
  if (rateLimited) {
    return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 })
  }

  try {
    // Parse JSON body
    const { imageUrl, imageId, vehicleId, assessmentId } = await req.json()

    if (!imageUrl || !imageId || !vehicleId) {
      return NextResponse.json({ error: "Image URL, image ID, and vehicle ID are required" }, { status: 400 })
    }

    // Get a JWT token for Convex authentication
    const token = await auth().getToken({ template: "convex" })

    if (!token) {
      return NextResponse.json({ error: "Failed to generate authentication token" }, { status: 500 })
    }

    // Call the AI model to detect damage
    const damageAnalysis = await analyzeVehicleImage(imageUrl)

    // Convert the detected damage to annotations
    const annotations = damageAnalysis.damages.map((damage) => ({
      id: uuidv4(),
      type: damage.type === "scratch" || damage.type === "crack" ? "rectangle" : "circle",
      x: damage.boundingBox.x,
      y: damage.boundingBox.y,
      width: damage.boundingBox.width,
      height: damage.boundingBox.height,
      radius:
        damage.type !== "scratch" && damage.type !== "crack"
          ? Math.max(damage.boundingBox.width, damage.boundingBox.height) / 2
          : undefined,
      color: DAMAGE_TYPES[damage.type as keyof typeof DAMAGE_TYPES]?.color || "#ff0000",
      text: `${damage.type} (${damage.confidence.toFixed(2)})`,
      severity: DAMAGE_TYPES[damage.type as keyof typeof DAMAGE_TYPES]?.severity || "minor",
      category: damage.type,
      description: damage.description,
      confidence: damage.confidence,
    }))

    // Save the annotations to Convex
    await convex.mutation(
      api.annotations.saveAnnotations,
      {
        imageId,
        vehicleId,
        assessmentId: assessmentId || undefined,
        annotations,
        summary: damageAnalysis.summary,
      },
      { authorization: `Bearer ${token}` },
    )

    // Log the AI detection event
    await convex.mutation(
      api.auditLogs.create,
      {
        action: "ai_damage_detection",
        resourceType: "image",
        resourceId: imageId,
        details: {
          vehicleId,
          assessmentId: assessmentId || null,
          damageCount: annotations.length,
        },
      },
      { authorization: `Bearer ${token}` },
    )

    return NextResponse.json({
      success: true,
      message: "Damage detection completed",
      detectedDamage: damageAnalysis.damages,
      annotations,
      summary: damageAnalysis.summary,
    })
  } catch (error: any) {
    console.error("Error detecting vehicle damage:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to detect vehicle damage",
      },
      {
        status: 500,
      },
    )
  }
}
