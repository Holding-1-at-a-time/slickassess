import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { v4 as uuidv4 } from "uuid"

// Create a Convex client for server-side API calls
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

// Define damage types and their corresponding colors
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
    // In a real implementation, you would call an AI service like OpenAI, Google Cloud Vision, etc.
    // For this example, we'll simulate AI detection with a function that returns mock results
    const detectedDamage = await detectVehicleDamage(imageUrl)

    // Convert the detected damage to annotations
    const annotations = detectedDamage.map((damage) => ({
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
    }))

    // Save the annotations to Convex
    await convex.mutation(
      api.annotations.saveAnnotations,
      {
        imageId,
        vehicleId,
        assessmentId: assessmentId || undefined,
        annotations,
      },
      { authorization: `Bearer ${token}` },
    )

    return NextResponse.json({
      success: true,
      message: "Damage detection completed",
      detectedDamage,
      annotations,
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

// Mock function to simulate AI damage detection
// In a real implementation, this would be replaced with calls to an AI service
async function detectVehicleDamage(imageUrl: string) {
  // Simulate API call delay
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // Generate random damage detections
  // In a real implementation, this would be the result from the AI model
  const numDetections = Math.floor(Math.random() * 5) + 1 // 1-5 detections
  const detections = []

  const damageTypes = Object.keys(DAMAGE_TYPES)
  const imageWidth = 800 // Assume standard image dimensions
  const imageHeight = 600

  for (let i = 0; i < numDetections; i++) {
    const damageType = damageTypes[Math.floor(Math.random() * damageTypes.length)]
    const x = Math.floor(Math.random() * (imageWidth - 100))
    const y = Math.floor(Math.random() * (imageHeight - 100))
    const width = Math.floor(Math.random() * 100) + 50
    const height = Math.floor(Math.random() * 100) + 50
    const confidence = Math.random() * 0.5 + 0.5 // 0.5-1.0 confidence

    detections.push({
      type: damageType,
      confidence,
      boundingBox: {
        x,
        y,
        width,
        height,
      },
    })
  }

  return detections
}
