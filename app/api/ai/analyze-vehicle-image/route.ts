import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { generateObject } from "ai"
import { MODELS, PROMPTS } from "@/lib/ai/ai-sdk-config"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { v4 as uuidv4 } from "uuid"

// Create a Convex client for server-side API calls
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
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
    const { imageUrl, imageId, vehicleId, assessmentId, analysisType } = await req.json()

    if (!imageUrl || !imageId || !vehicleId) {
      return NextResponse.json({ error: "Image URL, image ID, and vehicle ID are required" }, { status: 400 })
    }

    if (!["exterior", "interior"].includes(analysisType)) {
      return NextResponse.json({ error: "Analysis type must be 'exterior' or 'interior'" }, { status: 400 })
    }

    // Get a JWT token for Convex authentication
    const token = await auth().getToken({ template: "convex" })

    if (!token) {
      return NextResponse.json({ error: "Failed to generate authentication token" }, { status: 500 })
    }

    // Select the appropriate prompt based on analysis type
    const prompt = analysisType === "exterior" ? PROMPTS.exteriorDamageAnalysis : PROMPTS.interiorCleanlinessAnalysis

    // Call the AI model to analyze the image
    const result = await generateObject({
      model: MODELS.visionAnalysis,
      system: prompt,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
            {
              type: "text",
              text: `Analyze this vehicle ${analysisType} image and provide detailed assessment.`,
            },
          ],
        },
      ],
    })

    // Process the result based on analysis type
    let annotations = []

    if (analysisType === "exterior" && result.damages) {
      // Convert the detected damage to annotations
      annotations = result.damages.map((damage: any) => ({
        id: uuidv4(),
        type: "rectangle",
        x: damage.boundingBox.x,
        y: damage.boundingBox.y,
        width: damage.boundingBox.width,
        height: damage.boundingBox.height,
        color: getSeverityColor(damage.severity),
        text: `${damage.type} (${damage.severity})`,
        severity: damage.severity,
        category: damage.type,
        location: damage.location,
        repairComplexity: damage.repairComplexity,
      }))
    } else if (analysisType === "interior" && result.issues) {
      // Convert the detected interior issues to annotations
      annotations = result.issues.map((issue: any) => ({
        id: uuidv4(),
        type: "rectangle",
        x: issue.boundingBox.x,
        y: issue.boundingBox.y,
        width: issue.boundingBox.width,
        height: issue.boundingBox.height,
        color: getSeverityColor(issue.severity),
        text: `${issue.type} (${issue.severity})`,
        severity: issue.severity,
        category: issue.type,
        location: issue.location,
        recommendation: issue.recommendation,
      }))
    }

    // Save the annotations to Convex
    await convex.mutation(
      api.annotations.saveAnnotations,
      {
        imageId,
        vehicleId,
        assessmentId: assessmentId || undefined,
        annotations,
        analysisType,
      },
      { authorization: `Bearer ${token}` },
    )

    // Save the analysis results
    await convex.mutation(
      api.aiTraining.saveAnalysisResults,
      {
        imageId,
        vehicleId,
        assessmentId: assessmentId || undefined,
        analysisType,
        results: result,
      },
      { authorization: `Bearer ${token}` },
    )

    return NextResponse.json({
      success: true,
      message: `Vehicle ${analysisType} analysis completed`,
      result,
      annotations,
    })
  } catch (error: any) {
    console.error(`Error analyzing vehicle ${req.body?.analysisType || "image"}:`, error)
    return NextResponse.json(
      {
        error: error.message || `Failed to analyze vehicle image`,
      },
      {
        status: 500,
      },
    )
  }
}

// Helper function to get color based on severity
function getSeverityColor(severity: string): string {
  switch (severity.toLowerCase()) {
    case "minor":
      return "#ffcc00" // Yellow
    case "moderate":
      return "#ff6600" // Orange
    case "severe":
      return "#ff0000" // Red
    default:
      return "#3b82f6" // Blue
  }
}
