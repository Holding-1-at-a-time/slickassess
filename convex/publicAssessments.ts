import { mutation } from "./_generated/server"
import { v } from "convex/values"
import { ConvexError } from "convex/values"
import { checkRateLimit, recordRequest } from "./utils/rate-limiter"
import { sanitizeString, isValidEmail, isValidPhone } from "./utils/sanitize"

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
    clientIp: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const {
      tenantId,
      customerInfo,
      vehicleInfo,
      description,
      hasScratches,
      hasDents,
      needsDetailing,
      images,
      // Check rate limit
      const sanitizedEmail = sanitizeString(customerInfo.email)
      const identifier = sanitizedEmail // Use sanitized email as identifier
      const isRateLimited = await checkRateLimit(ctx, identifier, "publicAssessment", 5, 3600000) // 5 requests per hour
    // Get the tenant to retrieve the orgId
    const tenant = await ctx.db.get(tenantId)
    if (!tenant) {
      throw new ConvexError("Tenant not found")
    }

    const orgId = tenant.orgId
    const now = Date.now()

    // Use IP address for rate limiting if available, fallback to email
    const identifier = clientIp || customerInfo.email

    // Record the request for rate limiting
    await ctx.runMutation(recordRequest, {
      identifier,
      action: "publicAssessment",
    })

    // Check if rate limited
    const rateLimit = await ctx.runQuery(checkRateLimit, {
      identifier,
      action: "publicAssessment",
      config: {
        maxRequests: 5,
        windowMs: 3600000, // 5 requests per hour
      },
    })

    if (rateLimit.isRateLimited) {
      const secondsUntilReset = Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      throw new ConvexError(`Rate limit exceeded. Try again in ${secondsUntilReset} seconds.`)
    }

    // Validate and sanitize customer information
    const sanitizedCustomerInfo = {
      name: sanitizeString(customerInfo.name),
      email: sanitizeString(customerInfo.email),
      phone: sanitizeString(customerInfo.phone),
    }

    // Validate email format
    if (!isValidEmail(sanitizedCustomerInfo.email)) {
      throw new ConvexError("Invalid email format")
    }

    // Validate phone format
    if (!isValidPhone(sanitizedCustomerInfo.phone)) {
      throw new ConvexError("Invalid phone number format")
    }

    // Sanitize vehicle information
    const sanitizedVehicleInfo = {
      make: sanitizeString(vehicleInfo.make),
      model: sanitizeString(vehicleInfo.model),
      year: vehicleInfo.year,
      color: sanitizeString(vehicleInfo.color),
    }

    // Validate year is reasonable
    const currentYear = new Date().getFullYear()
    if (sanitizedVehicleInfo.year < 1900 || sanitizedVehicleInfo.year > currentYear + 1) {
      throw new ConvexError("Invalid vehicle year")
    }

    // Sanitize description
    const sanitizedDescription = sanitizeString(description)

    // Create lead assessment with sanitized data
    const leadId = await ctx.db.insert("leadAssessments", {
      tenantId: orgId,
      customerInfo: sanitizedCustomerInfo,
      vehicleInfo: sanitizedVehicleInfo,
      description: sanitizedDescription,
      hasScratches: hasScratches || false,
      hasDents: hasDents || false,
      needsDetailing: needsDetailing || false,
      imageIds: images,
      createdAt: now,
      updatedAt: now,
      sourceIp: clientIp ? sanitizeString(clientIp) : undefined,
    })

    // Create notification for organization admins
    await ctx.db.insert("notifications", {
      userId: null, // Will be filled in by a background job that finds org admins
      orgId,
      type: "new_lead",
      title: "New Lead Submitted",
      message: `A new lead has been submitted for ${sanitizedCustomerInfo.name}'s ${sanitizedVehicleInfo.year} ${sanitizedVehicleInfo.make} ${sanitizedVehicleInfo.model}`,
      link: `/leads`, // Link to leads page instead of dashboard
      read: false,
      createdAt: now,
    })

    // Log analytics event
    await ctx.db.insert("analyticsEvents", {
      orgId,
      eventType: "lead_created",
      eventData: {
        leadId,
        vehicleMake: sanitizedVehicleInfo.make,
        vehicleModel: sanitizedVehicleInfo.model,
        vehicleYear: sanitizedVehicleInfo.year,
        hasImages: images.length > 0,
        source: "qr_code",
      },
      timestamp: now,
    })

    return { success: true, leadId }
  },
})
