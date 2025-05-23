import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const signatureId = searchParams.get("signatureId")
    const reportId = searchParams.get("reportId")

    if (!signatureId && !reportId) {
      return NextResponse.json({ error: "Signature ID or Report ID is required" }, { status: 400 })
    }

    let signature
    if (signatureId) {
      signature = await convex.query(api.signatures.getSignatureById, { signatureId })
    } else if (reportId) {
      signature = await convex.query(api.signatures.getSignatureByReportId, { reportId })
    }

    if (!signature) {
      return NextResponse.json({ error: "Signature not found" }, { status: 404 })
    }

    // Verify signature integrity
    const verificationResult = await verifySignatureIntegrity(signature)

    return NextResponse.json({
      signature,
      verification: verificationResult,
    })
  } catch (error) {
    console.error("Error verifying signature:", error)
    return NextResponse.json({ error: "Failed to verify signature" }, { status: 500 })
  }
}

async function verifySignatureIntegrity(signature: any) {
  try {
    // Check if signature data exists
    if (!signature.approvalData?.finalSignature) {
      return {
        status: "invalid",
        reason: "No signature data found",
      }
    }

    const sig = signature.approvalData.finalSignature

    // Verify signature hash
    const expectedHash = generateSignatureHash(
      sig.signature,
      `${sig.signerName}|${sig.signerEmail}|${sig.signedAt}|${sig.userAgent}`,
    )

    if (sig.signatureHash !== expectedHash) {
      return {
        status: "invalid",
        reason: "Signature integrity check failed",
      }
    }

    // Check if signature is not too old (optional business rule)
    const signedDate = new Date(sig.signedAt)
    const now = new Date()
    const daysDiff = (now.getTime() - signedDate.getTime()) / (1000 * 60 * 60 * 24)

    if (daysDiff > 365) {
      // Signature older than 1 year
      return {
        status: "expired",
        reason: "Signature is older than 1 year",
      }
    }

    return {
      status: "verified",
      verifiedAt: new Date().toISOString(),
      signedAt: sig.signedAt,
      signerName: sig.signerName,
      signerEmail: sig.signerEmail,
    }
  } catch (error) {
    return {
      status: "invalid",
      reason: "Verification process failed",
      error: error.message,
    }
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
