import { mutation } from "./_generated/server"
import { v } from "convex/values"
import { requireAuth } from "./utils/auth"

// Submit feedback about AI detection
export const submitFeedback = mutation({
  args: {
    imageId: v.id("images"),
    assessmentId: v.optional(v.id("assessments")),
    rating: v.string(),
    feedback: v.optional(v.string()),
    originalPredictions: v.optional(v.any()),
    finalAnnotations: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await requireAuth(ctx)
    const now = Date.now()

    // Verify that the image exists and belongs to the current organization
    const image = await ctx.db.get(args.imageId)
    if (!image || image.orgId !== orgId) {
      throw new Error("Image not found or access denied")
    }

    // If assessmentId is provided, verify that it exists and belongs to the current organization
    if (args.assessmentId) {
      const assessment = await ctx.db.get(args.assessmentId)
      if (!assessment || assessment.orgId !== orgId) {
        throw new Error("Assessment not found or access denied")
      }
    }

    // Create the feedback record
    const feedbackId = await ctx.db.insert("aiFeedback", {
      imageId: args.imageId,
      assessmentId: args.assessmentId,
      rating: args.rating,
      feedback: args.feedback || "",
      originalPredictions: args.originalPredictions || [],
      finalAnnotations: args.finalAnnotations || [],
      orgId,
      createdBy: userId,
      createdAt: now,
    })

    // Log the action
    await ctx.db.insert("auditLogs", {
      orgId,
      clerkId: userId,
      action: "submitAIFeedback",
      resourceType: "aiFeedback",
      resourceId: feedbackId,
      createdAt: now,
    })

    return feedbackId
  },
})
