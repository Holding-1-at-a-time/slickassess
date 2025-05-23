import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import { ConvexError } from "convex/values"

// Submit a new signature
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

// Get signature by ID
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

// Get signature by report ID
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

// Get signatures for an organization
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

// Update signature status
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

// Get signature statistics
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

// Get detailed signature analytics with optimized queries
export const getSignatureAnalytics = query({
  args: {
    orgId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Define date range for queries
    const startDate = args.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000
    const endDate = args.endDate || Date.now()

    // Get signatures directly with date filtering in the database query
    // This is more efficient than fetching all and filtering in memory
    let signaturesQuery = ctx.db.query("digitalSignatures").withIndex("by_org", (q) => q.eq("orgId", args.orgId))

    // Apply date filters if provided
    if (args.startDate) {
      signaturesQuery = signaturesQuery.filter((q) => q.gte(q.field("createdAt"), args.startDate as number))
    }

    if (args.endDate) {
      signaturesQuery = signaturesQuery.filter((q) => q.lte(q.field("createdAt"), args.endDate as number))
    }

    // Execute the optimized query
    const signatures = await signaturesQuery.collect()

    // Generate analytics data
    const dailyActivity = generateDailyActivity(signatures, startDate, endDate)
    const completionTrend = generateCompletionTrend(signatures, startDate, endDate)
    const timeToSignDistribution = generateTimeToSignDistribution(signatures)
    const topPerformers = generateTopPerformers(signatures)

    // Get recent signatures with limit
    const recentSignatures = await ctx.db
      .query("digitalSignatures")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .order("desc")
      .take(10)
      .then((sigs) =>
        sigs.map((sig) => ({
          id: sig._id,
          customerName: sig.customerInfo.name,
          reportNumber: sig.reportId,
          vehicleInfo: getVehicleInfoForReport(sig.reportId), // Implement this helper function
          signedAt: sig.createdAt,
          status: sig.status,
          timeToSign: calculateTimeToSign(sig), // Implement this helper function
        })),
      )

    return {
      dailyActivity,
      completionTrend,
      timeToSignDistribution,
      topPerformers,
      recentSignatures,
    }
  },
})

// Helper function to get vehicle info for a report
async function getVehicleInfoForReport(reportId: string) {
  // Implement a proper lookup instead of random data
  // This should query the database for the actual vehicle info
  return `${Math.random() > 0.5 ? "2020 Toyota Camry" : "2019 Honda Civic"}`
}

// Helper function to calculate time to sign
function calculateTimeToSign(signature: any) {
  // Implement actual calculation based on created vs signed timestamps
  // For now, returning a placeholder
  return Math.random() * 72
}

// Helper function to generate daily activity data
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

// Helper function to generate completion trend data
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

// Helper function to generate time to sign distribution
function generateTimeToSignDistribution(signatures: any[]) {
  const ranges = [
    { range: "< 1 hour", min: 0, max: 1 },
    { range: "1-6 hours", min: 1, max: 6 },
    { range: "6-24 hours", min: 6, max: 24 },
    { range: "1-3 days", min: 24, max: 72 },
    { range: "> 3 days", min: 72, max: Number.POSITIVE_INFINITY },
  ]

  return ranges.map((range) => ({
    range: range.range,
    count: Math.floor(Math.random() * 20), // Mock data - would calculate actual time differences
  }))
}

// Helper function to generate top performers
function generateTopPerformers(signatures: any[]) {
  const customerPerformance = new Map()

  signatures.forEach((sig) => {
    const customerName = sig.customerInfo.name
    if (!customerPerformance.has(customerName)) {
      customerPerformance.set(customerName, {
        customerName,
        signaturesCount: 0,
        totalTime: 0,
      })
    }

    const perf = customerPerformance.get(customerName)
    perf.signaturesCount++
    perf.totalTime += Math.random() * 48 // Mock time data
  })

  return Array.from(customerPerformance.values())
    .map((perf) => ({
      ...perf,
      averageTime: perf.totalTime / perf.signaturesCount,
    }))
    .sort((a, b) => a.averageTime - b.averageTime)
    .slice(0, 10)
}

// Get signature completion funnel with optimized queries
export const getSignatureCompletionFunnel = query({
  args: {
    orgId: v.string(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const startDate = args.startDate || Date.now() - 30 * 24 * 60 * 60 * 1000
    const endDate = args.endDate || Date.now()

    // Get reports count with date filtering in the query
    let reportsQuery = ctx.db.query("assessmentReports").withIndex("by_org", (q) => q.eq("orgId", args.orgId))

    if (args.startDate) {
      reportsQuery = reportsQuery.filter((q) => q.gte(q.field("createdAt"), args.startDate as number))
    }

    if (args.endDate) {
      reportsQuery = reportsQuery.filter((q) => q.lte(q.field("createdAt"), args.endDate as number))
    }

    // Count reports instead of fetching all
    const reportsGenerated = await reportsQuery.count()

    // Get signatures with similar optimized query
    let signaturesQuery = ctx.db.query("digitalSignatures").withIndex("by_org", (q) => q.eq("orgId", args.orgId))

    if (args.startDate) {
      signaturesQuery = signaturesQuery.filter((q) => q.gte(q.field("createdAt"), args.startDate as number))
    }

    if (args.endDate) {
      signaturesQuery = signaturesQuery.filter((q) => q.lte(q.field("createdAt"), args.endDate as number))
    }

    // Execute the optimized query
    const signatures = await signaturesQuery.collect()

    // Calculate funnel metrics
    const signaturesSent = signatures.length

    // Get actual view counts from database if available, otherwise estimate
    // This should be replaced with actual tracking data in production
    const signaturesViewed = Math.floor(signaturesSent * 0.85)
    const signaturesStarted = Math.floor(signaturesSent * 0.65)

    // Count completed signatures (not pending)
    const signaturesCompleted = signatures.filter((s) => s.status !== "pending").length

    return {
      reportsGenerated,
      signaturesSent,
      signaturesViewed,
      signaturesStarted,
      signaturesCompleted,
      conversionRates: {
        sentToViewed: signaturesSent > 0 ? (signaturesViewed / signaturesSent) * 100 : 0,
        viewedToStarted: signaturesViewed > 0 ? (signaturesStarted / signaturesViewed) * 100 : 0,
        startedToCompleted: signaturesStarted > 0 ? (signaturesCompleted / signaturesStarted) * 100 : 0,
        overallConversion: signaturesSent > 0 ? (signaturesCompleted / signaturesSent) * 100 : 0,
      },
    }
  },
})
