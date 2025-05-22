import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { ConvexError } from "convex/values"
import { applyRateLimit, rateLimits } from "./utils/rate-limiter"
import { upsertClient, createVehicle, createAssessment, storeImages, createAuditLog } from "./utils/client-helpers"

// Create a public assessment (no auth required)
export const create = mutation({
  args: {
    tenantId: v.id("tenants"),
    clientInfo: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.optional(v.string()),
    }),
    vehicleInfo: v.object({
      make: v.string(),
      model: v.string(),
      year: v.number(),
      color: v.optional(v.string()),
      licensePlate: v.optional(v.string()),
      mileage: v.optional(v.number()),
    }),
    assessmentInfo: v.object({
      hasScratches: v.boolean(),
      hasDents: v.boolean(),
      hasRust: v.boolean(),
      hasInteriorDamage: v.boolean(),
      notes: v.optional(v.string()),
    }),
    imageUrls: v.array(v.string()),
    // IP address or other identifier for rate limiting
    clientIdentifier: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Apply rate limiting
    await ctx.runMutation(applyRateLimit, {
      identifier: args.clientIdentifier,
      action: "publicAssessment",
      config: rateLimits.publicAssessment,
    })

    // Verify tenant exists and is valid
    const tenant = await ctx.db.get(args.tenantId)
    if (!tenant) {
      throw new ConvexError("Tenant not found")
    }

    // Verify the tenant has an active QR slug
    if (!tenant.activeQrSlug) {
      throw new ConvexError("Invalid tenant configuration")
    }

    // Get organization ID from tenant
    const orgId = tenant.orgId

    // 1. Upsert client (handles race conditions)
    const clientId = await upsertClient(ctx, orgId, args.clientInfo, now)

    // 2. Create vehicle
    const vehicleId = await createVehicle(ctx, orgId, clientId, args.vehicleInfo, now)

    // 3. Create assessment
    const assessmentId = await createAssessment(ctx.db, orgId, vehicleId, args.vehicleInfo, args.assessmentInfo, now)

    // 4. Store images (if any)
    if (args.imageUrls.length > 0) {
      await storeImages(ctx.db, orgId, vehicleId, assessmentId, args.imageUrls, now)
    }

    // 5. Create audit log
    await createAuditLog(
      ctx.db,
      orgId,
      "createPublicAssessment",
      "assessment",
      assessmentId.toString(),
      `QR code self-assessment submitted for ${args.vehicleInfo.make} ${args.vehicleInfo.model}`,
      now,
    )

    return {
      success: true,
      assessmentId,
    }
  },
})

// Get public assessments for a tenant
export const getByTenant = query({
  args: {
    tenantId: v.id("tenants"),
  },
  handler: async (ctx, args) => {
    const tenant = await ctx.db.get(args.tenantId)
    if (!tenant) {
      throw new ConvexError("Tenant not found")
    }

    // Query assessments created via public submission
    const assessments = await ctx.db
      .query("assessments")
      .withIndex("by_orgId", (q) => q.eq("orgId", tenant.orgId))
      .filter((q) => q.eq(q.field("clerkId"), "public-submission"))
      .order("desc")
      .collect()

    return assessments
  },
})
