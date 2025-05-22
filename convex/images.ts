import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireAuth } from "./utils/auth"

// Mutation to create a new image record
export const createImage = mutation({
  args: {
    imageUrl: v.string(),
    vehicleId: v.optional(v.id("vehicles")),
    assessmentId: v.optional(v.id("assessments")),
    category: v.optional(v.string()),
    position: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Get the auth context (including orgId and userId)
    const { userId, orgId } = await requireAuth(ctx)
    const now = Date.now()

    // If vehicleId is provided, verify that it exists and belongs to the current organization
    if (args.vehicleId) {
      const vehicle = await ctx.db.get(args.vehicleId)
      if (!vehicle || vehicle.orgId !== orgId) {
        throw new Error("Vehicle not found or access denied")
      }
    }

    // If assessmentId is provided, verify that it exists and belongs to the current organization
    if (args.assessmentId) {
      const assessment = await ctx.db.get(args.assessmentId)
      if (!assessment || assessment.orgId !== orgId) {
        throw new Error("Assessment not found or access denied")
      }
    }

    // Create the image record
    const imageId = await ctx.db.insert("images", {
      orgId,
      createdBy: userId,
      imageUrl: args.imageUrl,
      vehicleId: args.vehicleId,
      assessmentId: args.assessmentId,
      category: args.category || "general",
      position: args.position || null,
      tags: args.tags || [],
      createdAt: now,
    })

    // Log the action
    await ctx.db.insert("auditLogs", {
      orgId,
      clerkId: userId,
      action: "createImage",
      resourceType: "image",
      resourceId: imageId,
      createdAt: now,
    })

    return imageId
  },
})

// Query to get images for a vehicle
export const getVehicleImages = query({
  args: { vehicleId: v.id("vehicles") },
  handler: async (ctx, args) => {
    // Get the auth context (including orgId)
    const { orgId } = await requireAuth(ctx)

    // Verify that the vehicle exists and belongs to the current organization
    const vehicle = await ctx.db.get(args.vehicleId)
    if (!vehicle || vehicle.orgId !== orgId) {
      throw new Error("Vehicle not found or access denied")
    }

    // Get the images
    const images = await ctx.db
      .query("images")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
      .collect()

    return images
  },
})

// Query to get images for an assessment
export const getAssessmentImages = query({
  args: { assessmentId: v.id("assessments") },
  handler: async (ctx, args) => {
    // Get the auth context (including orgId)
    const { orgId } = await requireAuth(ctx)

    // Verify that the assessment exists and belongs to the current organization
    const assessment = await ctx.db.get(args.assessmentId)
    if (!assessment || assessment.orgId !== orgId) {
      throw new Error("Assessment not found or access denied")
    }

    // Get the images
    const images = await ctx.db
      .query("images")
      .withIndex("by_assessmentId", (q) => q.eq("assessmentId", args.assessmentId))
      .collect()

    return images
  },
})

// Mutation to delete an image
export const deleteImage = mutation({
  args: { imageId: v.id("images") },
  handler: async (ctx, args) => {
    // Get the auth context (including orgId)
    const { userId, orgId } = await requireAuth(ctx)

    // Get the image
    const image = await ctx.db.get(args.imageId)

    // Verify that the image exists and belongs to the current organization
    if (!image || image.orgId !== orgId) {
      throw new Error("Image not found or access denied")
    }

    // Delete the image
    await ctx.db.delete(args.imageId)

    // Log the action
    await ctx.db.insert("auditLogs", {
      orgId,
      clerkId: userId,
      action: "deleteImage",
      resourceType: "image",
      resourceId: args.imageId,
      createdAt: Date.now(),
    })

    return args.imageId
  },
})
