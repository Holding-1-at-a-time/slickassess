import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { ConvexError } from "convex/values"

/**
 * Submits a new digital signature for an assessment report.
 *
 * This mutation creates a signature record, updates the associated assessment report,
 * and logs the action for audit purposes.
 *
 * @param args.reportId - The ID of the assessment report being signed
 * @param args.approvalData - Signature approval data and status
 * @param args.customerInfo - Customer information (name, email, phone)
 * @param args.businessInfo - Optional business information for commercial clients
 * @returns The ID of the created signature record
 *
 * @example
 * ```typescript
 * const signatureId = await submitSignature({
 *   reportId: "RPT-2024-001",
 *   approvalData: { status: "approved", signatureData: "..." },
 *   customerInfo: { name: "John Doe", email: "john@example.com", phone: "555-0123" }
 * });
 * ```
 */
export const submitSignature = mutation({
  args: {
    reportId: v.string(),
    approvalData: v.any(),
    customerInfo: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.string(),
    }),
    businessInfo: v.optional(
      v.object({
        name: v.string(),
        address: v.string(),
        phone: v.string(),
        email: v.string(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Create signature record
    const signatureId = await ctx.db.insert("digitalSignatures", {
      reportId: args.reportId,
      approvalData: args.approvalData,
      customerInfo: args.customerInfo,
      businessInfo: args.businessInfo,
      status: args.approvalData.status || "approved",
      createdAt: now,
      updatedAt: now,
    })

    // Update the assessment report with signature reference
    const reports = await ctx.db
      .query("assessmentReports")
      .filter((q) => q.eq(q.field("reportNumber"), args.reportId))
      .collect()

    if (reports.length > 0) {
      await ctx.db.patch(reports[0]._id, {
        signatureId,
        status: args.approvalData.status === "approved" ? "approved" : "pending",
      })
    }

    // Create audit log
    await ctx.db.insert("auditLogs", {
      orgId: reports[0]?.orgId || "unknown",
      clerkId: "customer", // Customer signature
      action: "submitSignature",
      resourceType: "signature",
      resourceId: signatureId,
      details: `Customer ${args.customerInfo.name} signed assessment report ${args.reportId}`,
      createdAt: now,
    })

    return signatureId
  },
})

/**
 * Retrieves a digital signature by its ID.
 *
 * @param args.signatureId - The unique identifier of the signature
 * @returns The signature record or throws an error if not found
 * @throws {ConvexError} When signature is not found
 */
export const getSignatureById = query({
  args: {
    signatureId: v.id("digitalSignatures"),
  },
  handler: async (ctx, args) => {
    const signature = await ctx.db.get(args.signatureId)
    if (!signature) {
      throw new ConvexError("Signature not found")
    }
    return signature
  },
})

/**
 * Retrieves the most recent signature for a specific report.
 *
 * @param args.reportId - The report ID to search for
 * @returns The most recent signature for the report, or null if none exists
 */
export const getSignatureByReportId = query({
  args: {
    reportId: v.string(),
  },
  handler: async (ctx, args) => {
    const signatures = await ctx.db
      .query("digitalSignatures")
      .filter((q) => q.eq(q.field("reportId"), args.reportId))
      .order("desc")
      .first()

    return signatures
  },
})

/**
 * Retrieves all signatures for an organization.
 *
 * This query first fetches all assessment reports for the organization,
 * then finds all signatures associated with those reports.
 *
 * @param args.orgId - The organization ID
 * @returns Array of signatures for the organization
 */
export const getSignaturesByOrg = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get all assessment reports for the org
    const reports = await ctx.db
      .query("assessmentReports")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect()

    const reportIds = reports.map((r) => r.reportNumber)

    // Get signatures for these reports
    const signatures = await ctx.db
      .query("digitalSignatures")
      .filter((q) => q.in(q.field("reportId"), reportIds))
      .order("desc")
      .collect()

    return signatures
  },
})

/**
 * Updates the status of an existing signature.
 *
 * @param args.signatureId - The ID of the signature to update
 * @param args.status - The new status for the signature
 * @param args.notes - Optional notes about the status change
 * @returns True if successful
 * @throws {ConvexError} When signature is not found
 */
export const updateSignatureStatus = mutation({
  args: {
    signatureId: v.id("digitalSignatures"),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const signature = await ctx.db.get(args.signatureId)
    if (!signature) {
      throw new ConvexError("Signature not found")
    }

    await ctx.db.patch(args.signatureId, {
      status: args.status,
      notes: args.notes,
      updatedAt: Date.now(),
    })

    return true
  },
})

/**
 * Calculates signature statistics for an organization.
 *
 * Provides aggregate statistics including total signatures, approval rates,
 * and status distribution within an optional date range.
 *
 * @param args.orgId - The organization ID
 * @param args.startDate - Optional start date for filtering (timestamp)
 * @param args.endDate - Optional end date for filtering (timestamp)
 * @returns Signature statistics object
 *
 * @example
 * ```typescript
 * const stats = await getSignatureStats({
 *   orgId: "org_123",
 *   startDate: Date.now() - 30 * 24 * 60 * 60 * 1000, // Last 30 days
 *   endDate: Date.now()
 * });
 * console.log(`Approval rate: ${stats.approvalRate}%`);
 * ```
 */
export const getSignatureStats = query({
  args: {
    orgId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get all assessment reports for the org
    const reports = await ctx.db
      .query("assessmentReports")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect()

    const reportIds = reports.map((r) => r.reportNumber)

    // Get signatures for these reports
    let signatures = await ctx.db
      .query("digitalSignatures")
      .filter((q) => q.in(q.field("reportId"), reportIds))
      .collect()

    // Filter by date range if provided
    if (args.startDate || args.endDate) {
      signatures = signatures.filter((sig) => {
        const createdAt = sig.createdAt
        if (args.startDate && createdAt < args.startDate) return false
        if (args.endDate && createdAt > args.endDate) return false
        return true
      })
    }

    // Calculate statistics
    const total = signatures.length
    const approved = signatures.filter((s) => s.status === "approved").length
    const rejected = signatures.filter((s) => s.status === "rejected").length
    const pending = signatures.filter((s) => s.status === "pending").length
    const requiresChanges = signatures.filter((s) => s.status === "requires_changes").length

    return {
      total,
      approved,
      rejected,
      pending,
      requiresChanges,
      approvalRate: total > 0 ? (approved / total) * 100 : 0,
    }
  },
})

/**
 * Retrieves detailed signature analytics with pagination support.
 *
 * This query provides comprehensive analytics data including daily activity,
 * completion trends, and performance metrics. It supports pagination for
 * handling large datasets efficiently.
 *
 * @param args.orgId - The organization ID
 * @param args.startDate - Optional start date for filtering (timestamp)
 * @param args.endDate - Optional end date for filtering (timestamp)
 * @param args.limit - Maximum number of records to return (default: 100, max: 1000)
 * @param args.cursor - Pagination cursor for retrieving next page
 * @returns Analytics data with pagination information
 *
 * @example
 * ```typescript
 * const analytics = await getSignatureAnalytics({
 *   orgId: "org_123",
 *   startDate: Date.now() - 30 * 24 * 60 * 60 * 1000,
 *   limit: 50
 * });
 *
 * // Get next page if available
 * if (analytics.pagination.hasMore) {
 *   const nextPage = await getSignatureAnalytics({
 *     orgId: "org_123",
 *     cursor: analytics.pagination.nextCursor,
 *     limit: 50
 *   });
 * }
 * ```
 */
export const getSignatureAnalytics = query({
  args: {
    orgId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()), // Add pagination limit
    cursor: v.optional(v.string()), // Add cursor for pagination
  },
  handler: async (ctx, args) => {
    const limit = Math.min(args.limit || 100, 1000) // Cap at 1000 records
    const startDate = args.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000
    const endDate = args.endDate || Date.now()

    // Build query with pagination
    let signaturesQuery = ctx.db
      .query("digitalSignatures")
      .withIndex("by_org_and_createdAt", (q) => q.eq("orgId", args.orgId))

    // Apply date filters
    if (args.startDate) {
      signaturesQuery = signaturesQuery.filter((q) => q.gte(q.field("createdAt"), args.startDate as number))
    }

    if (args.endDate) {
      signaturesQuery = signaturesQuery.filter((q) => q.lte(q.field("createdAt"), args.endDate as number))
    }

    // Apply cursor-based pagination
    if (args.cursor) {
      signaturesQuery = signaturesQuery.filter((q) => q.gt(q.field("_id"), args.cursor as string))
    }

    // Execute paginated query
    const signatures = await signaturesQuery.take(limit)

    // Get next cursor
    const nextCursor = signatures.length === limit ? signatures[signatures.length - 1]._id : null

    // Generate analytics data with paginated results
    const dailyActivity = generateDailyActivity(signatures, startDate, endDate)
    const completionTrend = generateCompletionTrend(signatures, startDate, endDate)

    return {
      signatures,
      dailyActivity,
      completionTrend,
      pagination: {
        hasMore: nextCursor !== null,
        nextCursor,
        limit,
        count: signatures.length,
      },
    }
  },
})

/**
 * Generates daily activity data for signature analytics.
 *
 * Creates a day-by-day breakdown of signature activity including
 * signatures sent and completed for each day in the specified range.
 *
 * @param signatures - Array of signature records
 * @param startDate - Start date timestamp
 * @param endDate - End date timestamp
 * @returns Array of daily activity data
 * @private
 */
function generateDailyActivity(signatures: any[], startDate: number, endDate: number) {
  const days = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000))
  const dailyData = []

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate + i * 24 * 60 * 60 * 1000)
    const dayStart = date.getTime()
    const dayEnd = dayStart + 24 * 60 * 60 * 1000

    const daySignatures = signatures.filter((sig) => sig.createdAt >= dayStart && sig.createdAt < dayEnd)

    const sent = daySignatures.length
    const completed = daySignatures.filter((sig) => sig.status !== "pending").length

    dailyData.push({
      date: date.toISOString().split("T")[0],
      sent,
      completed,
    })
  }

  return dailyData
}

/**
 * Generates completion trend data for signature analytics.
 *
 * Calculates completion and approval rates over time to show
 * trends in signature processing efficiency.
 *
 * @param signatures - Array of signature records
 * @param startDate - Start date timestamp
 * @param endDate - End date timestamp
 * @returns Array of trend data with completion and approval rates
 * @private
 */
function generateCompletionTrend(signatures: any[], startDate: number, endDate: number) {
  const days = Math.ceil((endDate - startDate) / (24 * 60 * 60 * 1000))
  const trendData = []

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate + i * 24 * 60 * 60 * 1000)
    const dayStart = date.getTime()
    const dayEnd = dayStart + 24 * 60 * 60 * 1000

    const daySignatures = signatures.filter((sig) => sig.createdAt >= dayStart && sig.createdAt < dayEnd)

    const total = daySignatures.length
    const completed = daySignatures.filter((sig) => sig.status !== "pending").length
    const approved = daySignatures.filter((sig) => sig.status === "approved").length

    const completionRate = total > 0 ? (completed / total) * 100 : 0
    const approvalRate = total > 0 ? (approved / total) * 100 : 0

    trendData.push({
      date: date.toISOString().split("T")[0],
      completionRate,
      approvalRate,
    })
  }

  return trendData
}

/**
 * Retrieves signature completion funnel data with pagination.
 *
 * Provides funnel analysis showing the conversion rates from
 * report generation through signature completion.
 *
 * @param args.orgId - The organization ID
 * @param args.startDate - Optional start date for filtering
 * @param args.endDate - Optional end date for filtering
 * @param args.pageSize - Number of records per page (default: 50, max: 200)
 * @param args.page - Page number (0-based)
 * @returns Funnel data with pagination information
 *
 * @example
 * ```typescript
 * const funnel = await getSignatureCompletionFunnelPaginated({
 *   orgId: "org_123",
 *   pageSize: 100,
 *   page: 0
 * });
 *
 * console.log(`Conversion rate: ${funnel.conversionRates.overallConversion}%`);
 * ```
 */
export const getSignatureCompletionFunnelPaginated = query({
  args: {
    orgId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    pageSize: v.optional(v.number()),
    page: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const pageSize = Math.min(args.pageSize || 50, 200) // Cap page size
    const page = args.page || 0
    const offset = page * pageSize

    // Use aggregation queries instead of fetching all records
    const reportsCount = await ctx.db
      .query("assessmentReports")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .filter((q) => {
        let filter = q
        if (args.startDate) {
          filter = filter.gte(q.field("createdAt"), args.startDate)
        }
        if (args.endDate) {
          filter = filter.lte(q.field("createdAt"), args.endDate)
        }
        return filter
      })
      .take(1000) // Sample for counting
      .then((results) => results.length)

    // Get paginated signatures
    const signatures = await ctx.db
      .query("digitalSignatures")
      .withIndex("by_org_and_createdAt", (q) => q.eq("orgId", args.orgId))
      .filter((q) => {
        let filter = q
        if (args.startDate) {
          filter = filter.gte(q.field("createdAt"), args.startDate)
        }
        if (args.endDate) {
          filter = filter.lte(q.field("createdAt"), args.endDate)
        }
        return filter
      })
      .take(pageSize)

    const signaturesCompleted = signatures.filter((s) => s.status !== "pending").length

    return {
      reportsGenerated: reportsCount,
      signaturesSent: signatures.length,
      signaturesCompleted,
      pagination: {
        page,
        pageSize,
        hasMore: signatures.length === pageSize,
        totalEstimate: reportsCount, // Estimate based on sample
      },
      conversionRates: {
        overallConversion: signatures.length > 0 ? (signaturesCompleted / signatures.length) * 100 : 0,
      },
    }
  },
})
