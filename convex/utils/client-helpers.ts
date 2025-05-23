/**
    * @description      : 
    * @author           : rrome
    * @group            : 
    * @created          : 22/05/2025 - 22:25:53
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 22/05/2025
    * - Author          : rrome
    * - Modification    : 
**/

import type { DatabaseWriter, MutationCtx } from "../_generated/server"
import type { Id } from "../_generated/dataModel"
import { v } from "convex/values";

// Constant for public submissions
export const PUBLIC_CLERK_ID = "public-submission"

/**
 * Upsert a client by email within an organization
 * Uses a proper upsert pattern to avoid race conditions
 */
export async function upsertClient(
  ctx: MutationCtx,
  orgId: string,
  { name, email, phone }: { name: string; email: string; phone?: string },
  now: number,
): Promise<Id<"clients">> {
  // Try to find existing client
  const existing = await ctx.db
    .query("clients")
    .withIndex("by_orgId_and_email", (q) => q.eq("orgId", orgId).eq("email", email))
    .first()

  if (existing) {
    // Update existing client if needed
    if (existing.name !== name || existing.phone !== phone) {
      await ctx.db.patch(existing._id, {
        name,
        phone,
        updatedAt: now,
      })
    }
    return existing._id
  }

  // Create new client
  try {
    return await ctx.db.insert("clients", {
      name,
      email,
      phone,
      status: "active",
      orgId,
      clerkId: PUBLIC_CLERK_ID,
      createdAt: now,
      updatedAt: now,
    })
  } catch (error) {
    // If insert fails (likely due to a race condition with the unique index),
    // try to fetch the client again
    const retryClient = await ctx.db
      .query("clients")
      .withIndex("by_orgId_and_email", (q) => q.eq("orgId", orgId).eq("email", email))
      .first()

    if (!retryClient) {
      throw new Error(`Failed to create or retrieve client with email ${email}`)
    }

    return retryClient._id
  }
}

/**
 * Create a vehicle record
 */
export async function createVehicle(
  ctx: DatabaseWriter,
  orgId: string,
  clientId: Id<"clients">,
  vehicleInfo: {
    make: string
    model: string
    year: number
    color?: string
    licensePlate?: string
    mileage?: number
  },
  now: number,
): Promise<Id<"vehicles">> {
  return ctx.insert("vehicles", {
    clientId,
    vin: "", // Empty for public submissions
    make: vehicleInfo.make,
    model: vehicleInfo.model,
    year: vehicleInfo.year,
    color: vehicleInfo.color,
    licensePlate: vehicleInfo.licensePlate,
    mileage: vehicleInfo.mileage,
    orgId,
    clerkId: PUBLIC_CLERK_ID,
    createdAt: now,
    updatedAt: now,
  })
}

/**
 * Create an assessment record
 */
export async function createAssessment(
  ctx: DatabaseWriter,
  orgId: string,
  vehicleId: Id<"vehicles">,
  vehicleInfo: { make: string; model: string },
  assessmentInfo: {
    hasScratches: boolean
    hasDents: boolean
    hasRust: boolean
    hasInteriorDamage: boolean
    notes?: string
  },
  now: number,
): Promise<Id<"assessments">> {
  // Create findings array based on assessment info
  const findings = []
  if (assessmentInfo.hasScratches) {
    findings.push("Scratches/paint damage")
  }
  if (assessmentInfo.hasDents) {
    findings.push("Dents/body damage")
  }
  if (assessmentInfo.hasRust) {
    findings.push("Rust/corrosion")
  }
  if (assessmentInfo.hasInteriorDamage) {
    findings.push("Interior damage")
  }

  return ctx.insert("assessments", {
    vehicleId,
    title: `QR Self-Assessment: ${vehicleInfo.make} ${vehicleInfo.model}`,
    description: assessmentInfo.notes || "Self-assessment submitted via QR code",
    status: "pending",
    findings: findings.map((finding) => ({ issue: finding, severity: "unknown" })),
    orgId,
    clerkId: PUBLIC_CLERK_ID,
    createdAt: now,
    updatedAt: now,
  })
}

/**
 * Store images for an assessment
 */
export async function storeImages(
  ctx: DatabaseWriter,
  orgId: string,
  vehicleId: Id<"vehicles">,
  assessmentId: Id<"assessments">,
  imageUrls: string[],
  now: number,
): Promise<void> {
  // Use Promise.all for parallel image insertion
  await Promise.all(
    imageUrls.map((imageUrl) =>
      ctx.insert("vehicleImages", {
        orgId,
        createdBy: PUBLIC_CLERK_ID,
        url: imageUrl,
        vehicleId,
        assessmentId,
        category: "qr-submission",
        tags: ["qr-code", "self-assessment"],
        isPrimary: false,
        createdAt: now,
        clerkId: PUBLIC_CLERK_ID,
      }),
    ),
  )
}

/**
 * Create an audit log entry
 */
export async function createAuditLog(
  ctx: DatabaseWriter,
  orgId: string,
  action: string,
  resourceType: string,
  resourceId: string,
  details: string,
  now: number,
): Promise<Id<"auditLogs">> {
  return ctx.insert("auditLogs", {
    orgId,
    clerkId: PUBLIC_CLERK_ID,
    action,
    resourceType,
    resourceId,
    details,
    createdAt: now,
  })
}
