import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireAuth } from "./utils/auth"

// Define the annotation object type
export type Annotation = {
  id: string
  type: "pin" | "rectangle" | "circle" | "arrow" | "text"
  x: number
  y: number
  width?: number
  height?: number
  radius?: number
  color: string
  text?: string
  severity?: "minor" | "moderate" | "severe"
  category?: string
}

// Save annotations for an image
export const saveAnnotations = mutation({
  args: {
    imageId: v.id("images"),
    vehicleId: v.id("vehicles"),
    assessmentId: v.optional(v.id("assessments")),
    annotations: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        x: v.number(),
        y: v.number(),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        radius: v.optional(v.number()),
        color: v.string(),
        text: v.optional(v.string()),
        severity: v.optional(v.string()),
        category: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await requireAuth(ctx)
    const now = Date.now()

    // Verify that the image exists and belongs to the current organization
    const image = await ctx.db.get(args.imageId)
    if (!image || image.orgId !== orgId) {
      throw new Error("Image not found or access denied")
    }

    // Verify that the vehicle exists and belongs to the current organization
    const vehicle = await ctx.db.get(args.vehicleId)
    if (!vehicle || vehicle.orgId !== orgId) {
      throw new Error("Vehicle not found or access denied")
    }

    // If assessmentId is provided, verify that it exists and belongs to the current organization
    if (args.assessmentId) {
      const assessment = await ctx.db.get(args.assessmentId)
      if (!assessment || assessment.orgId !== orgId) {
        throw new Error("Assessment not found or access denied")
      }
    }

    // Check if annotations already exist for this image
    const existingAnnotations = await ctx.db
      .query("imageAnnotations")
      .withIndex("by_imageId", (q) => q.eq("imageId", args.imageId))
      .unique()

    if (existingAnnotations) {
      // Update existing annotations
      await ctx.db.patch(existingAnnotations._id, {
        annotations: args.annotations,
        updatedAt: now,
      })

      return existingAnnotations._id
    } else {
      // Create new annotations
      const annotationId = await ctx.db.insert("imageAnnotations", {
        imageId: args.imageId,
        vehicleId: args.vehicleId,
        assessmentId: args.assessmentId,
        annotations: args.annotations,
        orgId,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })

      // Log the action
      await ctx.db.insert("auditLogs", {
        orgId,
        clerkId: userId,
        action: "createAnnotations",
        resourceType: "imageAnnotations",
        resourceId: annotationId,
        createdAt: now,
      })

      return annotationId
    }
  },
})

// Get annotations for an image
export const getAnnotations = query({
  args: {
    imageId: v.id("images"),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx)

    // Verify that the image exists and belongs to the current organization
    const image = await ctx.db.get(args.imageId)
    if (!image || image.orgId !== orgId) {
      throw new Error("Image not found or access denied")
    }

    // Get the annotations
    const annotations = await ctx.db
      .query("imageAnnotations")
      .withIndex("by_imageId", (q) => q.eq("imageId", args.imageId))
      .unique()

    return annotations
  },
})

// Get all annotations for a vehicle
export const getVehicleAnnotations = query({
  args: {
    vehicleId: v.id("vehicles"),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx)

    // Verify that the vehicle exists and belongs to the current organization
    const vehicle = await ctx.db.get(args.vehicleId)
    if (!vehicle || vehicle.orgId !== orgId) {
      throw new Error("Vehicle not found or access denied")
    }

    // Get the annotations
    const annotations = await ctx.db
      .query("imageAnnotations")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
      .collect()

    return annotations
  },
})

// Delete annotations for an image
export const deleteAnnotations = mutation({
  args: {
    annotationId: v.id("imageAnnotations"),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await requireAuth(ctx)

    // Get the annotations
    const annotations = await ctx.db.get(args.annotationId)

    // Verify that the annotations exist and belong to the current organization
    if (!annotations || annotations.orgId !== orgId) {
      throw new Error("Annotations not found or access denied")
    }

    // Delete the annotations
    await ctx.db.delete(args.annotationId)

    // Log the action
    await ctx.db.insert("auditLogs", {
      orgId,
      clerkId: userId,
      action: "deleteAnnotations",
      resourceType: "imageAnnotations",
      resourceId: args.annotationId,
      createdAt: Date.now(),
    })

    return args.annotationId
  },
})
