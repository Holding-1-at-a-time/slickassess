import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

// Initialize Convex HTTP client
const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "")

export async function POST(request: NextRequest) {
  try {
    // Get client IP for rate limiting
    const clientIp = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || "unknown"

    // Apply rate limiting
    try {
      await convexClient.mutation(api.utils.rateLimiter.applyRateLimit, {
        identifier: clientIp,
        action: "imageUpload",
        config: {
          maxRequests: 20,
          windowMs: 60 * 1000, // 1 minute
          message: "Too many image uploads. Please try again later.",
        },
      })
    } catch (error: any) {
      return NextResponse.json({ error: error.message || "Rate limit exceeded" }, { status: 429 })
    }

    // Process the form data
    const formData = await request.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    // Check file size (limit to 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 400 })
    }

    // Check file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"]
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Only JPEG, PNG, WEBP, and HEIC images are allowed." },
        { status: 400 },
      )
    }

    // Convert file to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Generate a storage URL from Convex
    const { storageId } = await convexClient.mutation(api.images.generateUploadUrl, {
      filename: file.name,
      contentType: file.type,
    })

    // Upload the file to Convex storage
    const uploadResult = await convexClient.mutation(api.images.uploadImage, {
      storageId,
      file: Array.from(buffer),
    })

    return NextResponse.json({
      success: true,
      imageUrl: uploadResult.url,
      storageId: uploadResult.storageId,
    })
  } catch (error: any) {
    console.error("Error uploading image:", error)
    return NextResponse.json({ error: "Failed to upload image" }, { status: 500 })
  }
}
