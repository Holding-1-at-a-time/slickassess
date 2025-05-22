import { mutation, query, action } from "./_generated/server"
import { v } from "convex/values"
import { requireAuth } from "./utils/auth"

/**
 * Saves feedback on AI predictions for training
 */
export const saveFeedback = mutation({
  args: {
    imageId: v.id("vehicleImages"),
    assessmentId: v.optional(v.id("assessments")),
    originalPredictions: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        confidence: v.number(),
        boundingBox: v.object({
          x: v.number(),
          y: v.number(),
          width: v.number(),
          height: v.number(),
        }),
        category: v.string(),
        severity: v.string(),
      }),
    ),
    correctedAnnotations: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        x: v.number(),
        y: v.number(),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        radius: v.optional(v.number()),
        category: v.string(),
        severity: v.string(),
      }),
    ),
    feedbackType: v.string(), // "correction", "confirmation", "rejection"
    feedbackNotes: v.optional(v.string()),
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

    // Save the feedback
    const feedbackId = await ctx.db.insert("aiFeedback", {
      imageId: args.imageId,
      assessmentId: args.assessmentId,
      originalPredictions: args.originalPredictions,
      correctedAnnotations: args.correctedAnnotations,
      feedbackType: args.feedbackType,
      feedbackNotes: args.feedbackNotes,
      orgId,
      clerkId: userId,
      createdAt: now,
    })

    // Log the action
    await ctx.db.insert("auditLogs", {
      orgId,
      clerkId: userId,
      action: "saveAIFeedback",
      resourceType: "aiFeedback",
      resourceId: feedbackId,
      createdAt: now,
    })

    return feedbackId
  },
})

/**
 * Gets feedback for training
 */
export const getFeedbackForTraining = query({
  args: {
    limit: v.number(),
    since: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx)

    // Get feedback since the specified timestamp, or all feedback if not specified
    let queryBuilder = ctx.db
      .query("aiFeedback")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .order("desc")
      .take(args.limit)

    if (args.since) {
      queryBuilder = queryBuilder.filter((q) => q.createdAt >= args.since)
    }

    const feedback = await queryBuilder.collect()

    // Get the image URLs for the feedback
    const imageIds = [...new Set(feedback.map((f) => f.imageId))]
    const images = await Promise.all(imageIds.map((id) => ctx.db.get(id)))

    // Create a map of image IDs to URLs
    const imageUrls: Record<string, string> = {}
    images.forEach((image) => {
      if (image) {
        imageUrls[image._id] = image.url
      }
    })

    return {
      feedback,
      imageUrls,
    }
  },
})

/**
 * Initiates the training pipeline
 */
export const initiateTraining = action({
  args: {
    modelName: v.string(),
    version: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await requireAuth(ctx)
    const now = Date.now()

    // In a real implementation, this would:
    // 1. Fetch feedback data
    // 2. Prepare training data
    // 3. Create a fine-tuning job
    // 4. Monitor the job status
    // 5. Deploy the fine-tuned model when ready

    // For this example, we'll just create a record of the training job
    const modelVersionId = await ctx.runMutation(async (ctx) => {
      return await ctx.db.insert("aiModelVersions", {
        modelName: args.modelName,
        version: args.version,
        trainingDataCount: 0, // This would be the actual count in a real implementation
        accuracy: 0.0, // This would be the actual accuracy in a real implementation
        isActive: false,
        createdAt: now,
      })
    })

    // Log the action
    await ctx.runMutation(async (ctx) => {
      await ctx.db.insert("auditLogs", {
        orgId,
        clerkId: userId,
        action: "initiateAITraining",
        resourceType: "aiModelVersion",
        resourceId: modelVersionId,
        createdAt: now,
      })
    })

    return {
      success: true,
      modelVersionId,
    }
  },
})

/**
 * Deploys a trained model
 */
export const deployModel = mutation({
  args: {
    modelVersionId: v.id("aiModelVersions"),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await requireAuth(ctx)
    const now = Date.now()

    // Get the model version
    const modelVersion = await ctx.db.get(args.modelVersionId)
    if (!modelVersion) {
      throw new Error("Model version not found")
    }

    // Deactivate the currently active model
    const activeModels = await ctx.db
      .query("aiModelVersions")
      .withIndex("by_modelName_and_isActive", (q) => q.eq("modelName", modelVersion.modelName).eq("isActive", true))
      .collect()

    for (const activeModel of activeModels) {
      await ctx.db.patch(activeModel._id, {
        isActive: false,
      })
    }

    // Activate the new model
    await ctx.db.patch(args.modelVersionId, {
      isActive: true,
      deployedAt: now,
    })

    // Log the action
    await ctx.db.insert("auditLogs", {
      orgId,
      clerkId: userId,
      action: "deployAIModel",
      resourceType: "aiModelVersion",
      resourceId: args.modelVersionId,
      createdAt: now,
    })

    return {
      success: true,
      modelVersionId: args.modelVersionId,
      deployedAt: now,
    }
  },
})

/**
 * Gets the active model version for a given model name
 */
export const getActiveModelVersion = query({
  args: {
    modelName: v.string(),
  },
  handler: async (ctx, args) => {
    // Get the active model version
    const activeModel = await ctx.db
      .query("aiModelVersions")
      .withIndex("by_modelName_and_isActive", (q) => q.eq("modelName", args.modelName).eq("isActive", true))
      .first()

    return activeModel
  },
})
