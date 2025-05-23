import { v } from "convex/values"
import { mutation, query } from "./_generated/server"
import type { Id } from "./_generated/dataModel"
import { ConvexError } from "convex/values"
import { requireAuth } from "./utils/auth"

// Save a new assessment report
export const saveAssessmentReport = mutation({
  args: {
    orgId: v.string(),
    userId: v.string(),
    vehicleId: v.string(),
    assessmentId: v.optional(v.string()),
    customerId: v.optional(v.string()),
    reportNumber: v.string(),
    generatedDate: v.string(),
    assessmentData: v.any(),
    status: v.string(),
    shareEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await requireAuth(ctx)

    // Verify organization membership
    if (identity.orgId !== args.orgId) {
      throw new ConvexError("Unauthorized: User does not belong to this organization")
    }

    // Convert string IDs to Convex IDs
    const vehicleId = args.vehicleId as Id<"vehicles">
    const assessmentId = args.assessmentId ? (args.assessmentId as Id<"assessments">) : undefined
    const customerId = args.customerId ? (args.customerId as Id<"clients">) : undefined

    // Save the report
    const reportId = await ctx.db.insert("assessmentReports", {
      orgId: args.orgId,
      userId: args.userId,
      vehicleId,
      assessmentId,
      customerId,
      reportNumber: args.reportNumber,
      generatedDate: args.generatedDate,
      assessmentData: args.assessmentData,
      status: args.status,
      shareEnabled: args.shareEnabled,
      viewCount: 0,
    })

    return reportId
  },
})

// Enable sharing for a report
export const enableReportSharing = mutation({
  args: {
    reportId: v.id("assessmentReports"),
    shareToken: v.string(),
    expiresAt: v.string(),
  },
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await requireAuth(ctx)

    // Get the report
    const report = await ctx.db.get(args.reportId)
    if (!report) {
      throw new ConvexError("Report not found")
    }

    // Verify organization membership
    if (identity.orgId !== report.orgId) {
      throw new ConvexError("Unauthorized: User does not belong to this organization")
    }

    // Update the report
    await ctx.db.patch(args.reportId, {
      shareEnabled: true,
      shareToken: args.shareToken,
      shareExpiresAt: args.expiresAt,
    })

    return true
  },
})

// Get a report by ID
export const getReportById = query({
  args: {
    reportId: v.id("assessmentReports"),
  },
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await requireAuth(ctx)

    // Get the report
    const report = await ctx.db.get(args.reportId)
    if (!report) {
      throw new ConvexError("Report not found")
    }

    // Verify organization membership
    if (identity.orgId !== report.orgId) {
      throw new ConvexError("Unauthorized: User does not belong to this organization")
    }

    return report
  },
})

// Get reports by vehicle ID
export const getReportsByVehicleId = query({
  args: {
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await requireAuth(ctx)

    // Get reports for this vehicle
    const reports = await ctx.db
      .query("assessmentReports")
      .withIndex("by_vehicle", (q) => q.eq("vehicleId", args.vehicleId))
      .filter((q) => q.eq(q.field("orgId"), identity.orgId))
      .order("desc")
      .collect()

    return reports
  },
})

// Get reports by assessment ID
export const getReportsByAssessmentId = query({
  args: {
    assessmentId: v.id("assessments"),
  },
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await requireAuth(ctx)

    // Get reports for this assessment
    const reports = await ctx.db
      .query("assessmentReports")
      .withIndex("by_assessment", (q) => q.eq("assessmentId", args.assessmentId))
      .filter((q) => q.eq(q.field("orgId"), identity.orgId))
      .order("desc")
      .collect()

    return reports
  },
})

// Get reports by customer ID
export const getReportsByCustomerId = query({
  args: {
    customerId: v.id("clients"),
  },
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await requireAuth(ctx)

    // Get reports for this customer
    const reports = await ctx.db
      .query("assessmentReports")
      .withIndex("by_customer", (q) => q.eq("customerId", args.customerId))
      .filter((q) => q.eq(q.field("orgId"), identity.orgId))
      .order("desc")
      .collect()

    return reports
  },
})

// Get a report by share token (public access)
export const getReportByShareToken = query({
  args: {
    shareToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the report by share token
    const reports = await ctx.db
      .query("assessmentReports")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.shareToken))
      .collect()

    if (reports.length === 0) {
      throw new ConvexError("Report not found or link has expired")
    }

    const report = reports[0]

    // Check if sharing is enabled and not expired
    if (!report.shareEnabled) {
      throw new ConvexError("This report is not available for sharing")
    }

    if (report.shareExpiresAt && new Date(report.shareExpiresAt) < new Date()) {
      throw new ConvexError("This share link has expired")
    }

    // Update view count
    await ctx.db.patch(report._id, {
      viewCount: (report.viewCount || 0) + 1,
      lastViewed: new Date().toISOString(),
    })

    return report
  },
})

// Archive a report
export const archiveReport = mutation({
  args: {
    reportId: v.id("assessmentReports"),
  },
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await requireAuth(ctx)

    // Get the report
    const report = await ctx.db.get(args.reportId)
    if (!report) {
      throw new ConvexError("Report not found")
    }

    // Verify organization membership
    if (identity.orgId !== report.orgId) {
      throw new ConvexError("Unauthorized: User does not belong to this organization")
    }

    // Update the report status
    await ctx.db.patch(args.reportId, {
      status: "archived",
    })

    return true
  },
})

// Delete a report
export const deleteReport = mutation({
  args: {
    reportId: v.id("assessmentReports"),
  },
  handler: async (ctx, args) => {
    // Verify authentication
    const identity = await requireAuth(ctx)

    // Get the report
    const report = await ctx.db.get(args.reportId)
    if (!report) {
      throw new ConvexError("Report not found")
    }

    // Verify organization membership
    if (identity.orgId !== report.orgId) {
      throw new ConvexError("Unauthorized: User does not belong to this organization")
    }

    // Delete the report
    await ctx.db.delete(args.reportId)

    return true
  },
})
