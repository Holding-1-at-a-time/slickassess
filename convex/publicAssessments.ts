import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { ConvexError } from "convex/values"
import type { Id } from "./_generated/dataModel"

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
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Verify tenant exists and is valid
    const tenant = await ctx.db.get(args.tenantId)
    if (!tenant) {
      throw new ConvexError("Tenant not found")
    }

    // Verify the tenant has an active QR slug
    if (!tenant.activeQrSlug) {
      throw new ConvexError("Invalid tenant configuration")
    }

    // Check if client already exists by email
    let clientId: Id<"clients"> | null = null
    const existingClients = await ctx.db
      .query("clients")
      .withIndex("by_orgId_and_email", (q) => q.eq("orgId", tenant.orgId).eq("email", args.clientInfo.email))
      .collect()

    if (existingClients.length > 0) {
      clientId = existingClients[0]._id
    } else {
      // Create new client
      clientId = await ctx.db.insert("clients", {
        name: args.clientInfo.name,
        email: args.clientInfo.email,
        phone: args.clientInfo.phone,
        status: "active",
        orgId: tenant.orgId,
        clerkId: "public-submission", // Special marker for public submissions
        createdAt: now,
        updatedAt: now,
      })
    }

    // Create vehicle
    const vehicleId = await ctx.db.insert("vehicles", {
      clientId,
      vin: "", // Empty for public submissions
      make: args.vehicleInfo.make,
      model: args.vehicleInfo.model,
      year: args.vehicleInfo.year,
      color: args.vehicleInfo.color,
      licensePlate: args.vehicleInfo.licensePlate,
      mileage: args.vehicleInfo.mileage,
      orgId: tenant.orgId,
      clerkId: "public-submission",
      createdAt: now,
      updatedAt: now,
    })

    // Create assessment
    const findings = []
    if (args.assessmentInfo.hasScratches) findings.push("Scratches/paint damage")
    if (args.assessmentInfo.hasDents) findings.push("Dents/body damage")
    if (args.assessmentInfo.hasRust) findings.push("Rust/corrosion")
    if (args.assessmentInfo.hasInteriorDamage) findings.push("Interior damage")

    const assessmentId = await ctx.db.insert("assessments", {
      vehicleId,
      title: `QR Self-Assessment: ${args.vehicleInfo.make} ${args.vehicleInfo.model}`,
      description: args.assessmentInfo.notes || "Self-assessment submitted via QR code",
      status: "pending",
      findings: findings.map((finding) => ({ issue: finding, severity: "unknown" })),
      orgId: tenant.orgId,
      clerkId: "public-submission",
      createdAt: now,
      updatedAt: now,
    })

    // Store images
    for (const imageUrl of args.imageUrls) {
      await ctx.db.insert("images", {
        orgId: tenant.orgId,
        createdBy: "public-submission",
        imageUrl,
        vehicleId,
        assessmentId,
        category: "qr-submission",
        tags: ["qr-code", "self-assessment"],
        createdAt: now,
      })
    }

    // Create audit log
    await ctx.db.insert("auditLogs", {
      orgId: tenant.orgId,
      clerkId: "public-submission",
      action: "createPublicAssessment",
      resourceType: "assessment",
      resourceId: assessmentId.toString(),
      details: `QR code self-assessment submitted for ${args.vehicleInfo.make} ${args.vehicleInfo.model}`,
      createdAt: now,
    })

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
