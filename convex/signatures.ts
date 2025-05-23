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
