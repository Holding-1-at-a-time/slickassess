import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { rateLimit } from "@/convex/utils/rate-limiter"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: NextRequest) {
  try {
    // Get IP address for rate limiting
    const ip = req.ip || req.headers.get("x-forwarded-for") || "unknown"

    // Apply rate limiting
    const rateLimitResult = await rateLimit({
      identifier: `signature_submit_${ip}`,
      limit: 5,
      timeframe: 60 * 60, // 1 hour
    })

    if (!rateLimitResult.success) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 })
    }

    // Parse request body
    const body = await req.json()
    const { reportId, approvalData, customerInfo, businessInfo } = body

    if (!reportId || !approvalData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Validate signature data
    if (approvalData.finalSignature) {
      const signature = approvalData.finalSignature
      if (!signature.signature || !signature.signerName || !signature.signerEmail || !signature.signatureHash) {
        return NextResponse.json({ error: "Invalid signature data" }, { status: 400 })
      }

      // Verify signature hash (basic integrity check)
      // In production, implement proper cryptographic verification
      const expectedHash = generateSignatureHash(
        signature.signature,
        `${signature.signerName}|${signature.signerEmail}|${signature.signedAt}|${signature.userAgent}`,
      )

      if (signature.signatureHash !== expectedHash) {
        return NextResponse.json({ error: "Signature integrity check failed" }, { status: 400 })
      }
    }

    // Add IP address and timestamp to approval data
    const enhancedApprovalData = {
      ...approvalData,
      submittedFrom: ip,
      submittedAt: new Date().toISOString(),
      userAgent: req.headers.get("user-agent") || "unknown",
    }

    // Save to database using Convex
    const signatureId = await convex.mutation(api.signatures.submitSignature, {
      reportId,
      approvalData: enhancedApprovalData,
      customerInfo,
      businessInfo,
    })

    // Send confirmation email (if configured)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/emails/signature-confirmation`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signatureId,
          customerInfo,
          businessInfo,
          reportId,
        }),
      })
    } catch (emailError) {
      console.error("Failed to send confirmation email:", emailError)
      // Don't fail the signature submission if email fails
    }

    return NextResponse.json({
      success: true,
      signatureId,
      message: "Signature submitted successfully",
    })
  } catch (error) {
    console.error("Error submitting signature:", error)
    return NextResponse.json({ error: "Failed to submit signature" }, { status: 500 })
  }
}

function generateSignatureHash(signatureData: string, metadata: string): string {
  // Simple hash function for signature integrity
  // In production, use a proper cryptographic hash like SHA-256
  let hash = 0
  const str = signatureData + metadata
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32-bit integer
  }
  return Math.abs(hash).toString(16)
}
