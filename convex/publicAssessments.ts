import { mutation } from "./_generated/server"
import { v } from "convex/values"
import { ConvexError } from "convex/values"
import { checkRateLimit, recordRateLimitedRequest } from "./utils/rate-limiter"

// Create a public assessment from QR code scan
export const createPublicAssessment = mutation({
  args: {
    tenantId: v.id("tenants"),
    customerInfo: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.string(),
    }),
    vehicleInfo: v.object({
      make: v.string(),
      model: v.string(),
      year: v.number(),
      color: v.string(),
    }),
    description: v.string(),
    hasScratches: v.optional(v.boolean()),
    hasDents: v.optional(v.boolean()),
    needsDetailing: v.optional(v.boolean()),
    images: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId, customerInfo, vehicleInfo, description, hasScratches, hasDents, needsDetailing, images } = args

    // Get the tenant to retrieve the orgId
    const tenant = await ctx.db.get(tenantId)
    if (!tenant) {
      throw new ConvexError("Tenant not found")
    }

    const orgId = tenant.orgId
    const now = Date.now()

    // Check rate limit
    const identifier = customerInfo.email // Use email as identifier
    const isRateLimited = await checkRateLimit(ctx, identifier, "publicAssessment", 5, 3600000) // 5 requests per hour

    if (isRateLimited) {
      await recordRateLimitedRequest(ctx, identifier, "publicAssessment")
      throw new ConvexError("Rate limit exceeded. Please try again later.")
    }

    // Create lead assessment
    const leadId = await ctx.db.insert("leadAssessments", {
      tenantId: orgId,
      customerInfo,
      vehicleInfo,
      description,
      hasScratches: hasScratches || false,
      hasDents: hasDents || false,
      needsDetailing: needsDetailing || false,
      imageIds: images,
      createdAt: now,
      updatedAt: now,
    })

    // Create notification for organization admins
    await ctx.db.insert("notifications", {
      userId: null, // Will be filled in by a background job that finds org admins
      orgId,
      type: "new_lead",
      title: "New Lead Submitted",
      message: `A new lead has been submitted for ${customerInfo.name}'s ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`,
      link: `/dashboard`, // Link to dashboard where leads are shown
      read: false,
      createdAt: now,
    })

    return { success: true, leadId }
  },
})
