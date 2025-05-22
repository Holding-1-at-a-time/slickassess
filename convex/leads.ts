import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { ConvexError } from "convex/values"
import { requireAuth, requireOrgRole } from "./utils/auth"
import type { Id } from "./_generated/dataModel"
import { randomUUID } from "crypto"
import { checkRateLimit, recordRequest } from "./utils/rate-limiter"
import { sanitizeString, isValidEmail, isValidPhone } from "./utils/sanitize"

// Counter table for assessment numbers to avoid full table scans
export const getNextAssessmentNumber = mutation({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = args

    // Get or create the counter document for this org
    const counterDoc = await ctx.db
      .query("counters")
      .withIndex("by_orgId_and_type", (q) => q.eq("orgId", orgId).eq("type", "assessmentNumber"))
      .first()

    let nextNumber = 1

    if (counterDoc) {
      // Increment existing counter
      nextNumber = counterDoc.currentValue + 1
      await ctx.db.patch(counterDoc._id, {
        currentValue: nextNumber,
        updatedAt: Date.now(),
      })
    } else {
      // Create new counter starting at 1
      await ctx.db.insert("counters", {
        orgId,
        type: "assessmentNumber",
        currentValue: nextNumber,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      })
    }

    return `ASMT-${String(nextNumber).padStart(5, "0")}`
  },
})

// Helper function to convert a lead to an assessment
export async function convertLeadToAssessment(
  ctx: any,
  leadId: Id<"leadAssessments">,
  userId: string,
  options?: { bulkOperation?: boolean },
) {
  const now = Date.now()

  // Get the lead
  const lead = await ctx.db.get(leadId)
  if (!lead) {
    throw new ConvexError("Lead not found")
  }

  // Check if already converted
  if (lead.convertedToAssessment) {
    throw new ConvexError("Lead already converted to assessment")
  }

  // Verify the lead belongs to the user's organization
  const userOrgs = await ctx.runQuery(requireOrgRole, { orgId: lead.tenantId })
  if (!userOrgs) {
    throw new ConvexError("You don't have permission to convert this lead")
  }

  // Create or get client
  let clientId: Id<"clients">
  const existingClient = await ctx.db
    .query("clients")
    .withIndex("by_orgId_and_email", (q) => q.eq("orgId", lead.tenantId).eq("email", lead.customerInfo.email))
    .first()

  if (existingClient) {
    clientId = existingClient._id
  } else {
    clientId = await ctx.db.insert("clients", {
      name: lead.customerInfo.name,
      email: lead.customerInfo.email,
      phone: lead.customerInfo.phone,
      status: "active",
      orgId: lead.tenantId,
      clerkId: userId || "system",
      createdAt: now,
      updatedAt: now,
    })
  }

  // Create vehicle
  const vehicleId = await ctx.db.insert("vehicles", {
    clientId,
    vin: "", // Empty for lead conversions
    make: lead.vehicleInfo.make,
    model: lead.vehicleInfo.model,
    year: lead.vehicleInfo.year,
    color: lead.vehicleInfo.color,
    orgId: lead.tenantId,
    clerkId: userId || "system",
    createdAt: now,
    updatedAt: now,
  })

  // Generate assessment number using the counter
  const assessmentNumber = await ctx.runMutation(getNextAssessmentNumber, {
    orgId: lead.tenantId,
  })

  // Prepare identified issues based on lead data
  const identifiedIssues = []
  if (lead.hasScratches) {
    identifiedIssues.push({
      section: "Exterior",
      severity: "minor",
      description: "Client-reported scratches",
      imageIds: lead.imageIds,
      aiDetected: false,
    })
  }
  if (lead.hasDents) {
    identifiedIssues.push({
      section: "Exterior",
      severity: "moderate",
      description: "Client-reported dents",
      imageIds: lead.imageIds,
      aiDetected: false,
    })
  }

  // Create assessment
  const assessmentId = await ctx.db.insert("assessments", {
    vehicleId,
    clientId,
    title: `${lead.vehicleInfo.year} ${lead.vehicleInfo.make} ${lead.vehicleInfo.model} Assessment`,
    description: lead.description,
    status: "draft",
    orgId: lead.tenantId,
    clerkId: userId || "system",
    assessmentNumber,
    assessmentDate: now,
    mileage: null,
    notes: `Converted from self-assessment lead ${lead._id}`,
    sections: [
      {
        id: randomUUID(),
        name: "Exterior",
        condition: null,
        notes: null,
        imageIds: lead.imageIds,
      },
      {
        id: randomUUID(),
        name: "Interior",
        condition: null,
        notes: null,
        imageIds: [],
      },
      {
        id: randomUUID(),
        name: "Engine Bay",
        condition: null,
        notes: null,
        imageIds: [],
      },
      {
        id: randomUUID(),
        name: "Wheels & Tires",
        condition: null,
        notes: null,
        imageIds: [],
      },
    ],
    identifiedIssues,
    recommendedServices: lead.needsDetailing
      ? [
          {
            name: "Full Detailing Service",
            description: "Client requested detailing service",
            priority: "medium",
          },
        ]
      : [],
    createdAt: now,
    updatedAt: now,
    createdBy: userId || "system",
  })

  // Mark the lead as converted
  await ctx.db.patch(leadId, {
    convertedToAssessment: assessmentId,
    updatedAt: now,
  })

  // Only create notification for individual conversions, not bulk
  if (!options?.bulkOperation) {
    // Create notification for the conversion
    await ctx.db.insert("notifications", {
      userId: null, // Will be filled in by a background job that finds org admins
      orgId: lead.tenantId,
      type: "lead_converted",
      title: "Lead Converted to Assessment",
      message: `Lead for ${lead.customerInfo.name}'s ${lead.vehicleInfo.year} ${lead.vehicleInfo.make} ${lead.vehicleInfo.model} has been converted to a full assessment`,
      link: `/assessments/${assessmentId}`,
      read: false,
      createdAt: now,
    })

    // Log the action
    await ctx.db.insert("auditLogs", {
      orgId: lead.tenantId,
      clerkId: userId || "system",
      action: "convertLeadToAssessment",
      resourceType: "leadAssessment",
      resourceId: lead._id,
      details: JSON.stringify({ assessmentId }),
      createdAt: now,
    })
  }

  // Log analytics event
  await ctx.db.insert("analyticsEvents", {
    orgId: lead.tenantId,
    eventType: "lead_converted",
    eventData: {
      leadId: lead._id,
      assessmentId,
      vehicleMake: lead.vehicleInfo.make,
      vehicleModel: lead.vehicleInfo.model,
      vehicleYear: lead.vehicleInfo.year,
      conversionTime: now - lead.createdAt, // Time to convert in ms
      bulkOperation: options?.bulkOperation || false,
    },
    userId,
    timestamp: now,
  })

  return assessmentId
}

// List leads by tenant with filtering and sorting
export const listByTenant = query({
  args: {
    tenantId: v.string(),
    filters: v.optional(
      v.object({
        status: v.optional(v.union(v.literal("all"), v.literal("converted"), v.literal("unconverted"))),
        dateRange: v.optional(
          v.object({
            start: v.number(),
            end: v.number(),
          }),
        ),
        vehicleMake: v.optional(v.string()),
        vehicleModel: v.optional(v.string()),
        search: v.optional(v.string()),
      }),
    ),
    sort: v.optional(
      v.object({
        field: v.union(
          v.literal("createdAt"),
          v.literal("customerName"),
          v.literal("vehicleMake"),
          v.literal("vehicleModel"),
          v.literal("vehicleYear"),
        ),
        direction: v.union(v.literal("asc"), v.literal("desc")),
      }),
    ),
    pagination: v.optional(
      v.object({
        limit: v.number(),
        cursor: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { tenantId, filters, sort, pagination } = args
    const { userId } = await requireAuth(ctx)

    // Verify tenant exists and user has access to it
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", tenantId))
      .first()

    if (!tenant) {
      throw new ConvexError("Tenant not found")
    }

    // Verify the user has access to this tenant's organization
    await requireOrgRole(ctx, tenantId)

    // Start building the query
    let query = ctx.db.query("leadAssessments").withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))

    // Apply filters
    if (filters) {
      // Filter by status
      if (filters.status) {
        if (filters.status === "converted") {
          query = query.filter((q) => q.neq(q.field("convertedToAssessment"), undefined))
        } else if (filters.status === "unconverted") {
          query = query.filter((q) => q.eq(q.field("convertedToAssessment"), undefined))
        }
      } else {
        // Default to unconverted if not specified
        query = query.filter((q) => q.eq(q.field("convertedToAssessment"), undefined))
      }

      // Search by customer name, email, or vehicle details
      if (filters.search && filters.search.trim() !== "") {
        // Properly sanitize search input using the utility function
        const sanitizedSearch = sanitizeSearchQuery(filters.search.trim().toLowerCase())

        // Use Convex's built-in search capabilities safely
        query = query.filter((q) =>
          q.or(
            q.contains(q.lower(q.field("customerInfo.name")), sanitizedSearch),
            q.contains(q.lower(q.field("customerInfo.email")), sanitizedSearch),
            q.contains(q.lower(q.field("vehicleInfo.make")), sanitizedSearch),
            q.contains(q.lower(q.field("vehicleInfo.model")), sanitizedSearch),
          ),
        )
      }
      // Filter by vehicle model
      if (filters.vehicleModel) {
        query = query.filter((q) => q.eq(q.field("vehicleInfo.model"), filters.vehicleModel))
      }

      // Search by customer name, email, or vehicle details - FIXED SECURITY ISSUE
      if (filters.search && filters.search.trim() !== "") {
        // Sanitize and validate search input
        const sanitizedSearch = sanitizeString(filters.search.trim().toLowerCase())

        // Use Convex's built-in search capabilities safely
        query = query.filter((q) =>
          q.or(
            q.contains(q.lower(q.field("customerInfo.name")), sanitizedSearch),
            q.contains(q.lower(q.field("customerInfo.email")), sanitizedSearch),
            q.contains(q.lower(q.field("vehicleInfo.make")), sanitizedSearch),
            q.contains(q.lower(q.field("vehicleInfo.model")), sanitizedSearch),
          ),
        )
      }
    } else {
      // Default to unconverted if no filters specified
      query = query.filter((q) => q.eq(q.field("convertedToAssessment"), undefined))
    }

    // Apply sorting
    if (sort) {
      const direction = sort.direction === "asc" ? "asc" : "desc"

      switch (sort.field) {
        case "createdAt":
          query = query.order(direction, (q) => q.field("createdAt"))
          break
        case "customerName":
          query = query.order(direction, (q) => q.field("customerInfo.name"))
          break
        case "vehicleMake":
          query = query.order(direction, (q) => q.field("vehicleInfo.make"))
          break
        case "vehicleModel":
          query = query.order(direction, (q) => q.field("vehicleInfo.model"))
          break
        case "vehicleYear":
          query = query.order(direction, (q) => q.field("vehicleInfo.year"))
          break
        default:
          query = query.order("desc", (q) => q.field("createdAt"))
      }
    } else {
      // Default sort by createdAt desc
      query = query.order("desc", (q) => q.field("createdAt"))
    }

    // Apply pagination
    if (pagination) {
      const { limit, cursor } = pagination
      if (cursor) {
        const cursorObj = JSON.parse(cursor)
        query = query.paginate(cursorObj, limit)
      } else {
        query = query.paginate({}, limit)
      }

      const paginatedResults = await query

      return {
        leads: paginatedResults.page,
        continuationToken: paginatedResults.continuationToken
          ? JSON.stringify(paginatedResults.continuationToken)
          : null,
      }
    }

    // If no pagination, just collect all results
    const leads = await query.collect()
    return { leads, continuationToken: null }
  },
})

// Get a single lead by ID
export const getById = query({
  args: {
    leadId: v.id("leadAssessments"),
  },
  handler: async (ctx, args) => {
    const { leadId } = args
    const { userId } = await requireAuth(ctx)

    const lead = await ctx.db.get(leadId)
    if (!lead) {
      throw new ConvexError("Lead not found")
    }

    // Verify the user has access to this lead's organization
    await requireOrgRole(ctx, lead.tenantId)

    return lead
  },
})

// Get unique vehicle makes and models for filtering
export const getFilterOptions = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenantId } = args
    const { userId } = await requireAuth(ctx)

    // Verify the user has access to this tenant's organization
    await requireOrgRole(ctx, tenantId)

    const leads = await ctx.db
      .query("leadAssessments")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .collect()

    const makes = new Set<string>()
    const models = new Set<string>()

    leads.forEach((lead) => {
      makes.add(lead.vehicleInfo.make)
      models.add(lead.vehicleInfo.model)
    })

    return {
      makes: Array.from(makes).sort(),
      models: Array.from(models).sort(),
    }
  },
})

// Convert a lead to a full assessment
export const convertLeadToAssessmentMutation = mutation({
  args: {
    leadAssessmentId: v.id("leadAssessments"),
  },
  handler: async (ctx, args) => {
    const { leadAssessmentId } = args
    const { userId } = await requireAuth(ctx)

    // Use the shared helper function
    return await convertLeadToAssessment(ctx, leadAssessmentId, userId)
  },
})

// Bulk convert leads to assessments with transaction-like behavior
export const bulkConvertLeads = mutation({
  args: {
    leadIds: v.array(v.id("leadAssessments")),
  },
  handler: async (ctx, args) => {
    const { leadIds } = args
    const { userId } = await requireAuth(ctx)
    const now = Date.now()

    // Check rate limit for bulk operations
    const identifier = userId
    await ctx.runMutation(recordRequest, {
      identifier,
      action: "bulk_convert_leads",
    })

    const rateLimit = await ctx.runQuery(checkRateLimit, {
      identifier,
      action: "bulk_convert_leads",
      config: {
        maxRequests: 10,
        windowMs: 60 * 1000, // 10 operations per minute
      },
    })

    if (rateLimit.isRateLimited) {
      const secondsUntilReset = Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      throw new ConvexError(`Rate limit exceeded. Try again in ${secondsUntilReset} seconds.`)
    }

    // Validate all leads first to ensure they can be converted
    const leadsToConvert = []
    const invalidLeads = []

    for (const leadId of leadIds) {
      const lead = await ctx.db.get(leadId)
      if (!lead || lead.convertedToAssessment) {
        invalidLeads.push(leadId)
      } else {
        // Verify the user has access to this lead's organization
        try {
          await requireOrgRole(ctx, lead.tenantId)
          leadsToConvert.push(lead)
        } catch (error) {
          invalidLeads.push(leadId)
        }
      }
    }

    // If there are invalid leads, fail the entire operation
    if (invalidLeads.length > 0) {
      throw new ConvexError({
        message: "Some leads cannot be converted",
        code: "INVALID_LEADS",
        invalidLeadIds: invalidLeads,
      })
    }

    // Process all leads in a transaction-like manner
    const results = {
      success: [] as Id<"assessments">[],
      failed: [] as Id<"leadAssessments">[],
    }

    try {
      // Create a batch of operations
      for (const lead of leadsToConvert) {
        try {
          const assessmentId = await convertLeadToAssessment(ctx, lead._id, userId, { bulkOperation: true })
          results.success.push(assessmentId)
        } catch (error) {
          console.error(`Error converting lead ${lead._id}:`, error)
          results.failed.push(lead._id)
        }
      }

      // Create a single notification for all conversions
      if (results.success.length > 0 && leadsToConvert.length > 0) {
        await ctx.db.insert("notifications", {
          userId: null,
          orgId: leadsToConvert[0].tenantId,
          type: "bulk_lead_converted",
          title: "Bulk Lead Conversion",
          message: `${results.success.length} leads have been converted to assessments`,
          link: `/assessments`,
          read: false,
          createdAt: now,
        })

        // Log the bulk action
        await ctx.db.insert("auditLogs", {
          orgId: leadsToConvert[0].tenantId,
          clerkId: userId || "system",
          action: "bulkConvertLeads",
          resourceType: "leadAssessment",
          resourceId: "bulk",
          details: JSON.stringify({
            count: results.success.length,
            assessmentIds: results.success,
          }),
          createdAt: now,
        })
      }
    } catch (error) {
      // If any operation fails, throw an error to abort the entire transaction
      console.error("Error in bulk convert operation:", error)
      throw new ConvexError({
        message: "Bulk conversion failed",
        code: "BULK_OPERATION_FAILED",
        details: error instanceof Error ? error.message : String(error),
      })
    }

    return results
  },
})

// Bulk delete leads with transaction-like behavior
export const bulkDeleteLeads = mutation({
  args: {
    leadIds: v.array(v.id("leadAssessments")),
  },
  handler: async (ctx, args) => {
    const { leadIds } = args
    const { userId } = await requireAuth(ctx)
    const now = Date.now()

    // Check rate limit for bulk operations
    const identifier = userId
    await ctx.runMutation(recordRequest, {
      identifier,
      action: "bulk_delete_leads",
    })

    const rateLimit = await ctx.runQuery(checkRateLimit, {
      identifier,
      action: "bulk_delete_leads",
      config: {
        maxRequests: 10,
        windowMs: 60 * 1000, // 10 operations per minute
      },
    })

    if (rateLimit.isRateLimited) {
      const secondsUntilReset = Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      throw new ConvexError(`Rate limit exceeded. Try again in ${secondsUntilReset} seconds.`)
    }

    // Validate all leads first to ensure they can be deleted
    const leadsToDelete = []
    const invalidLeads = []

    for (const leadId of leadIds) {
      const lead = await ctx.db.get(leadId)
      if (!lead) {
        invalidLeads.push(leadId)
      } else if (lead.convertedToAssessment) {
        // Only allow deleting unconverted leads
        invalidLeads.push(leadId)
      } else {
        // Verify the user has access to this lead's organization
        try {
          await requireOrgRole(ctx, lead.tenantId)
          leadsToDelete.push(lead)
        } catch (error) {
          invalidLeads.push(leadId)
        }
      }
    }

    // If there are invalid leads, fail the entire operation
    if (invalidLeads.length > 0) {
      throw new ConvexError({
        message: "Some leads cannot be deleted",
        code: "INVALID_LEADS",
        invalidLeadIds: invalidLeads,
      })
    }

    const results = {
      success: [] as Id<"leadAssessments">[],
      failed: [] as Id<"leadAssessments">[],
    }

    try {
      // Process all leads in a transaction-like manner
      for (const lead of leadsToDelete) {
        await ctx.db.delete(lead._id)
        results.success.push(lead._id)
      }

      // Create a single notification and audit log for the bulk operation
      if (results.success.length > 0 && leadsToDelete.length > 0) {
        // Log the bulk action
        await ctx.db.insert("auditLogs", {
          orgId: leadsToDelete[0].tenantId,
          clerkId: userId || "system",
          action: "bulkDeleteLeads",
          resourceType: "leadAssessment",
          resourceId: "bulk",
          details: JSON.stringify({
            count: results.success.length,
            leadIds: results.success,
          }),
          createdAt: now,
        })
      }
    } catch (error) {
      // If any operation fails, throw an error to abort the entire transaction
      console.error("Error in bulk delete operation:", error)
      throw new ConvexError({
        message: "Bulk deletion failed",
        code: "BULK_OPERATION_FAILED",
        details: error instanceof Error ? error.message : String(error),
      })
    }

    return results
  },
})

// Get lead analytics
export const getLeadAnalytics = query({
  args: {
    tenantId: v.string(),
    timeframe: v.optional(v.union(v.literal("7d"), v.literal("30d"), v.literal("90d"), v.literal("all"))),
  },
  handler: async (ctx, args) => {
    const { tenantId, timeframe = "30d" } = args
    const { userId } = await requireAuth(ctx)

    // Ensure user has admin role
    await requireOrgRole(ctx, tenantId, ["admin"])

    // Calculate start date based on timeframe
    let startDate = 0
    const now = Date.now()

    switch (timeframe) {
      case "7d":
        startDate = now - 7 * 24 * 60 * 60 * 1000
        break
      case "30d":
        startDate = now - 30 * 24 * 60 * 60 * 1000
        break
      case "90d":
        startDate = now - 90 * 24 * 60 * 60 * 1000
        break
      case "all":
        startDate = 0
        break
    }

    // Get all leads for the tenant in the timeframe
    const leads = await ctx.db
      .query("leadAssessments")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", tenantId))
      .filter((q) => q.gte(q.field("createdAt"), startDate))
      .collect()

    // Get conversion events
    const conversionEvents = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_orgId_eventType", (q) => q.eq("orgId", tenantId).eq("eventType", "lead_converted"))
      .filter((q) => q.gte(q.field("timestamp"), startDate))
      .collect()

    // Calculate metrics
    const totalLeads = leads.length
    const convertedLeads = leads.filter((lead) => lead.convertedToAssessment).length
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0

    // Calculate average time to conversion
    let avgConversionTime = 0
    if (conversionEvents.length > 0) {
      const totalConversionTime = conversionEvents.reduce((sum, event) => {
        return sum + ((event.eventData.conversionTime as number) || 0)
      }, 0)
      avgConversionTime = totalConversionTime / conversionEvents.length
    }

    // Group leads by vehicle make
    const leadsByMake: Record<string, number> = {}
    leads.forEach((lead) => {
      const { make } = lead.vehicleInfo
      leadsByMake[make] = (leadsByMake[make] || 0) + 1
    })

    // Group leads by day
    const leadsByDay: Record<string, number> = {}
    leads.forEach((lead) => {
      const date = new Date(lead.createdAt).toISOString().split("T")[0]
      leadsByDay[date] = (leadsByDay[date] || 0) + 1
    })

    // Sort and format for charts
    const leadsByMakeChart = Object.entries(leadsByMake)
      .sort((a, b) => b[1] - a[1])
      .map(([make, count]) => ({ make, count }))

    const leadsByDayChart = Object.entries(leadsByDay)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, count]) => ({ date, count }))

    return {
      summary: {
        totalLeads,
        convertedLeads,
        conversionRate: conversionRate.toFixed(1),
        avgConversionTimeMinutes: Math.round(avgConversionTime / (1000 * 60)),
      // Verify tenant exists
      const tenant = await ctx.db.get(tenantId)

      if (!tenant) {
        throw new ConvexError("Tenant not found")
      }

      const orgId = tenant.orgId

// Create a lead assessment from public form with rate limiting
export const createLeadAssessment = mutation({
  args: {
    tenantId: v.string(),
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
      clientIp,
    } = args
    const now = Date.now()

    // Apply rate limiting based on IP address or tenant
    const identifier = clientIp || tenantId

    // Record the request for rate limiting
    await ctx.runMutation(recordRequest, {
      identifier,
      action: "create_lead_assessment",
    })

    // Check if rate limited
    const rateLimit = await ctx.runQuery(checkRateLimit, {
      identifier,
      action: "create_lead_assessment",
      config: {
        maxRequests: 5,
        windowMs: 60 * 1000, // 5 submissions per minute
      },
    })

    if (rateLimit.isRateLimited) {
      const secondsUntilReset = Math.ceil((rateLimit.resetTime - Date.now()) / 1000)
      throw new ConvexError(`Rate limit exceeded. Try again in ${secondsUntilReset} seconds.`)
    }

    // Verify tenant exists
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", tenantId))
      .first()

    if (!tenant) {
      throw new ConvexError("Tenant not found")
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
      tenantId,
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

    // Create notification for new lead
    await ctx.db.insert("notifications", {
      userId: null, // Will be filled in by a background job that finds org admins
      orgId: tenantId,
      type: "new_lead",
      title: "New Lead Submitted",
      message: `A new lead has been submitted for ${sanitizedCustomerInfo.name}'s ${sanitizedVehicleInfo.year} ${sanitizedVehicleInfo.make} ${sanitizedVehicleInfo.model}`,
      link: `/leads`, // Link to leads page
      read: false,
      createdAt: now,
    })

    // Log analytics event
    await ctx.db.insert("analyticsEvents", {
      orgId: tenantId,
      eventType: "lead_created",
      eventData: {
        leadId,
        vehicleMake: sanitizedVehicleInfo.make,
        vehicleModel: sanitizedVehicleInfo.model,
        vehicleYear: sanitizedVehicleInfo.year,
        hasImages: images.length > 0,
      },
      timestamp: now,
    })

    return { success: true, leadId }
  },
})
