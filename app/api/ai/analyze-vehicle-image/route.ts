import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { generateObject } from "ai"
import { MODELS, PROMPTS } from "@/lib/ai/ai-sdk-config"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { v4 as uuidv4 } from "uuid"
import { validateRequestAsync } from "@/lib/validation/api-validator"
import { analyzeVehicleImageSchema } from "@/lib/validation/schemas"
import { logger } from "@/lib/logging/logger"
import { validateCsrfToken } from "@/lib/security/csrf"

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
    // Validate CSRF token
    const csrfValidation = await validateCsrfToken(req)
    if (!csrfValidation.valid) {
      logger.warn({ reason: csrfValidation.reason }, "CSRF validation failed")
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }

    // Validate request body
    const validation = await validateRequestAsync(req, {
      schema: analyzeVehicleImageSchema,
      source: "body",
    })

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation Error",
          details: validation.error.errors.map((err) => ({
            path: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 },
      )
    }

    const { imageUrl, imageId, vehicleId, assessmentId, analysisType } = validation.data

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

    logger.info(
      {
        userId,
        orgId,
        vehicleId,
        imageId,
        analysisType,
        annotationCount: annotations.length,
      },
      "Vehicle image analysis completed",
    )

    return NextResponse.json({
      success: true,
      message: `Vehicle ${analysisType} analysis completed`,
      result,
      annotations,
    })
  } catch (error: any) {
    logger.error(
      {
        error,
        userId,
        orgId,
        analysisType: req.body?.analysisType,
      },
      "Error analyzing vehicle image",
    )

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
