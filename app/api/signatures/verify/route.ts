import { type NextRequest, NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { requireEnv } from "@/utils/env"
import crypto from "crypto"

const convex = new ConvexHttpClient(requireEnv("NEXT_PUBLIC_CONVEX_URL"))

type VerificationResult = { status: "valid" } | { status: "invalid"; reason: string }

async function verifySignatureIntegrity(
  signatureId: string,
  signatureData: string,
  metadata: string,
): Promise<VerificationResult> {
  try {
    const signature = await convex.query(api.signatures.getSignatures, {
      signatureId: signatureId,
    })

    if (!signature) {
      return { status: "invalid", reason: "Signature not found" }
    }

    const expectedHash = generateSignatureHash(signatureData, metadata)
    if (signature.signatureHash !== expectedHash) {
      return { status: "invalid", reason: "Hash mismatch" }
    }

    return { status: "valid" }
  } catch (error) {
    console.error("Signature verification failed:", error) // Log full error internally
    return {
      status: "invalid",
      reason: "Verification process failed",
      // Don't expose raw error message to client
    }
  }
}

function generateSignatureHash(signatureData: string, metadata: string): string {
  // Use cryptographically secure SHA-256 hash
  const hash = crypto.createHash("sha256")
  hash.update(signatureData + metadata)
  return hash.digest("hex")
}

export async function POST(req: NextRequest): Promise<NextResponse> {
  try {
    const { signatureId, signatureData, metadata } = await req.json()

    if (!signatureId || !signatureData || !metadata) {
      return NextResponse.json({ status: "invalid", reason: "Missing parameters" }, { status: 400 })
    }

    const verificationResult = await verifySignatureIntegrity(signatureId, signatureData, metadata)

    if (verificationResult.status === "valid") {
      return NextResponse.json({ status: "valid" }, { status: 200 })
    } else {
      return NextResponse.json({ status: "invalid", reason: verificationResult.reason }, { status: 400 })
    }
  } catch (error) {
    console.error("API error:", error) // Log full error internally
    return NextResponse.json({ status: "invalid", reason: "Internal server error" }, { status: 500 })
  }
}
