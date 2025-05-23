import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { requireEnv } from "@/utils/env"
import crypto from "crypto"

// Use requireEnv to ensure the environment variable is defined
const convexUrl = requireEnv("NEXT_PUBLIC_CONVEX_URL")
const convex = new ConvexHttpClient(convexUrl)

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
    // Log the full error internally
    console.error("Error verifying signature:", error)
    // Return a generic error message to the client
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

    // Verify signature hash using secure crypto
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
    // Log the full error internally
    console.error("Signature verification failed:", error)
    // Return a generic error message without exposing details
    return {
      status: "invalid",
      reason: "Verification process failed",
    }
  }
}

function generateSignatureHash(signatureData: string, metadata: string): string {
  // Use cryptographically secure SHA-256 hash
  const hash = crypto.createHash("sha256")
  hash.update(signatureData + metadata)
  return hash.digest("hex")
}
