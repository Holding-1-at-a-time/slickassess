import type { NextRequest } from "next/server"
import { z } from "zod"
import { handleApiError, createError } from "@/lib/error-handling"
import { analyzeVehicleImage } from "@/lib/ai/vehicle-damage-ai"
import { validateRequest } from "@/lib/validation/api-validator"

// Input validation schema
const requestSchema = z.object({
  imageUrl: z.string().url("Invalid image URL"),
  vehicleId: z.string().min(1, "Vehicle ID is required"),
  assessmentId: z.string().optional(),
})

export async function POST(req: NextRequest) {
  try {
    // Validate request
    const body = await validateRequest(req, requestSchema)

    // Check authentication
    const authHeader = req.headers.get("authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw createError.authentication("Authentication required")
    }

    // Extract token
    const token = authHeader.split(" ")[1]

    // Validate token (simplified for example)
    if (!token) {
      throw createError.authentication("Invalid token")
    }

    // Process the request
    const result = await analyzeVehicleImage({
      imageUrl: body.imageUrl,
      vehicleId: body.vehicleId,
      assessmentId: body.assessmentId,
    })

    // Return successful response
    return Response.json({
      success: true,
      data: result,
    })
  } catch (error) {
    // Handle errors
    return handleApiError(error, req)
  }
}
