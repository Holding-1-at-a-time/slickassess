import { mutation, query, action } from "./_generated/server"
import { v } from "convex/values"
import { requireAuth, requireOrgRole } from "./utils/auth"

// Helper function to generate assessment number
async function generateAssessmentNumber(ctx: any, orgId: string) {
  const existing = await ctx.db
    .query("assessments")
    .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
    .order("desc")
    .take(1)
    .collect()

  let nextNumber = 1
  if (existing.length > 0) {
    const last = existing[0].assessmentNumber
    const match = last.match(/\d+$/)
    if (match) nextNumber = Number.parseInt(match[0], 10) + 1
  }

  return `ASS-${String(nextNumber).padStart(5, "0")}`
}

// Create a new assessment
export const create = mutation({
  args: {
    vehicleId: v.id("vehicles"),
    assessmentDate: v.number(),
    mileage: v.number(),
    notes: v.optional(v.string()),
    templateSections: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        requiredImages: v.number(),
      }),
    ),
  },
  handler: async (ctx, args) => {
    // Get the auth context (including orgId and userId)
    const { orgId, userId } = await requireAuth(ctx)
    const now = Date.now()

    // Verify that the vehicle exists and belongs to the current organization
    const vehicle = await ctx.db.get(args.vehicleId)
    if (!vehicle || vehicle.orgId !== orgId) {
      throw new Error("Vehicle not found or access denied")
    }

    // Generate assessment number
    const assessmentNumber = await generateAssessmentNumber(ctx, orgId)

    // Prepare sections
    const sections = args.templateSections.map((section) => ({
      id: section.id,
      name: section.name,
      condition: null,
      notes: null,
      imageIds: [],
    }))

    // Create the assessment
    const assessmentId = await ctx.db.insert("assessments", {
      orgId,
      vehicleId: args.vehicleId,
      clientId: vehicle.clientId,
      assessmentNumber,
      status: "draft",
      assessmentDate: args.assessmentDate,
      mileage: args.mileage,
      notes: args.notes || "",
      sections,
      identifiedIssues: [],
      recommendedServices: [],
      overallCondition: "",
      aiSummary: "",
      createdBy: userId,
      createdAt: now,
      updatedAt: now,
    })

    // Update the vehicle with the latest assessment info
    await ctx.db.patch(args.vehicleId, {
      lastAssessmentAt: now,
      lastAssessmentId: assessmentId,
      updatedAt: now,
    })

    // Log the action
    await ctx.db.insert("auditLogs", {
      orgId,
      userId,
      action: "createAssessment",
      resourceType: "assessment",
      resourceId: assessmentId,
      createdAt: now,
    })

    return assessmentId
  },
})

// Get an assessment by ID
export const getById = query({
  args: { id: v.id("assessments") },
  handler: async (ctx, args) => {
    // Get the auth context (including orgId)
    const { orgId } = await requireAuth(ctx)

    // Get the assessment
    const assessment = await ctx.db.get(args.id)

    // Verify that the assessment exists and belongs to the current organization
    if (!assessment || assessment.orgId !== orgId) {
      throw new Error("Assessment not found or access denied")
    }

    // Get the vehicle
    const vehicle = await ctx.db.get(assessment.vehicleId)

    // Get the client
    const client = vehicle ? await ctx.db.get(vehicle.clientId as any) : null

    return {
      ...assessment,
      vehicle: vehicle
        ? {
            id: vehicle._id,
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            vin: vehicle.vin,
          }
        : null,
      client: client
        ? {
            id: client._id,
            name: client.name,
          }
        : null,
    }
  },
})

// List assessments with filtering and pagination
export const list = query({
  args: {
    clientId: v.optional(v.id("clients")),
    vehicleId: v.optional(v.id("vehicles")),
    status: v.optional(v.string()),
    page: v.number(),
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    // Get the auth context (including orgId)
    const { orgId } = await requireAuth(ctx)

    // Calculate pagination
    const { page, limit } = args
    const skip = (page - 1) * limit

    // Start with a query filtered by organization
    let queryBuilder = ctx.db.query("assessments").withIndex("by_orgId", (q) => q.eq("orgId", orgId))

    // Apply client filter if provided
    if (args.clientId) {
      queryBuilder = queryBuilder.filter((q) => q.eq(q.field("clientId"), args.clientId))
    }

    // Apply vehicle filter if provided
    if (args.vehicleId) {
      queryBuilder = queryBuilder.filter((q) => q.eq(q.field("vehicleId"), args.vehicleId))
    }

    // Apply status filter if provided
    if (args.status) {
      queryBuilder = queryBuilder.filter((q) => q.eq(q.field("status"), args.status))
    }

    // Order by creation date (newest first)
    queryBuilder = queryBuilder.order("desc", (q) => q.field("createdAt"))

    // Execute the query with pagination
    const assessments = await queryBuilder.take(skip + limit).collect()
    const paginatedAssessments = assessments.slice(skip, skip + limit)

    // Fetch related vehicle and client data
    const enrichedAssessments = await Promise.all(
      paginatedAssessments.map(async (assessment) => {
        const vehicle = await ctx.db.get(assessment.vehicleId)
        const client = vehicle ? await ctx.db.get(vehicle.clientId as any) : null

        return {
          ...assessment,
          vehicleInfo: vehicle ? `${vehicle.make} ${vehicle.model} (${vehicle.year})` : "Unknown Vehicle",
          clientName: client ? client.name : "Unknown Client",
        }
      }),
    )

    return enrichedAssessments
  },
})

// Complete an assessment and generate AI summary
export const complete = action({
  args: {
    id: v.id("assessments"),
    generateAISummary: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Get the auth context (including orgId and userId)
    const { orgId, userId } = await requireAuth(ctx)
    const now = Date.now()

    // Get the assessment
    const assessment = await ctx.db.get(args.id)

    // Verify that the assessment exists and belongs to the current organization
    if (!assessment || assessment.orgId !== orgId) {
      throw new Error("Assessment not found or access denied")
    }

    // Verify that the assessment is in a valid state for completion
    if (assessment.status !== "draft" && assessment.status !== "in_progress") {
      throw new Error(`Cannot complete assessment with status ${assessment.status}`)
    }

    // Generate AI summary if requested
    let aiSummary = ""
    if (args.generateAISummary) {
      const vehicle = await ctx.db.get(assessment.vehicleId)

      // In a real implementation, this would call an AI service
      // For now, we'll generate a simple summary
      aiSummary = `This ${vehicle.year} ${vehicle.make} ${vehicle.model} was assessed on ${new Date(assessment.assessmentDate).toLocaleDateString()}. The vehicle has ${assessment.mileage} miles and is in ${assessment.overallCondition || "unknown"} condition overall.`

      // Add section details
      if (assessment.sections.length > 0) {
        aiSummary += " The assessment covered the following areas: "
        aiSummary += assessment.sections.map((s) => `${s.name} (${s.condition || "not rated"})`).join(", ")
        aiSummary += "."
      }

      // Add issues and recommendations
      if (assessment.identifiedIssues.length > 0) {
        aiSummary += " Issues identified include: "
        aiSummary += assessment.identifiedIssues.map((i) => i.description).join(", ")
        aiSummary += "."
      }

      if (assessment.recommendedServices.length > 0) {
        aiSummary += " Recommended services include: "
        aiSummary += assessment.recommendedServices.map((s) => s.name).join(", ")
        aiSummary += "."
      }
    }

    // Update the assessment
    await ctx.db.patch(args.id, {
      status: "completed",
      completedAt: now,
      aiSummary,
      updatedAt: now,
    })

    // Log the action
    await ctx.db.insert("auditLogs", {
      orgId,
      userId,
      action: "completeAssessment",
      resourceType: "assessment",
      resourceId: args.id,
      createdAt: now,
      details: { generatedAISummary: args.generateAISummary },
    })

    return {
      id: args.id,
      status: "completed",
      completedAt: now,
      aiSummary,
      updatedAt: now,
    }
  },
})

// Update an assessment
export const update = mutation({
  args: {
    id: v.id("assessments"),
    assessmentDate: v.optional(v.number()),
    mileage: v.optional(v.number()),
    notes: v.optional(v.string()),
    status: v.optional(v.string()),
    sections: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          condition: v.union(v.string(), v.null()),
          notes: v.union(v.string(), v.null()),
          imageIds: v.array(v.string()),
        }),
      ),
    ),
    identifiedIssues: v.optional(
      v.array(
        v.object({
          section: v.string(),
          severity: v.string(),
          description: v.string(),
        }),
      ),
    ),
    recommendedServices: v.optional(
      v.array(
        v.object({
          name: v.string(),
          description: v.string(),
          priority: v.string(),
        }),
      ),
    ),
    overallCondition: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the auth context (including orgId and userId)
    const { orgId, userId } = await requireAuth(ctx)
    const now = Date.now()

    // Get the assessment
    const assessment = await ctx.db.get(args.id)

    // Verify that the assessment exists and belongs to the current organization
    if (!assessment || assessment.orgId !== orgId) {
      throw new Error("Assessment not found or access denied")
    }

    // Prepare update object
    const updateData: any = {
      updatedAt: now,
    }

    // Add optional fields if provided
    if (args.assessmentDate !== undefined) updateData.assessmentDate = args.assessmentDate
    if (args.mileage !== undefined) updateData.mileage = args.mileage
    if (args.notes !== undefined) updateData.notes = args.notes
    if (args.status !== undefined) updateData.status = args.status
    if (args.sections !== undefined) updateData.sections = args.sections
    if (args.identifiedIssues !== undefined) updateData.identifiedIssues = args.identifiedIssues
    if (args.recommendedServices !== undefined) updateData.recommendedServices = args.recommendedServices
    if (args.overallCondition !== undefined) updateData.overallCondition = args.overallCondition

    // Update the assessment
    await ctx.db.patch(args.id, updateData)

    // Log the action
    await ctx.db.insert("auditLogs", {
      orgId,
      userId,
      action: "updateAssessment",
      resourceType: "assessment",
      resourceId: args.id,
      createdAt: now,
    })

    return args.id
  },
})

// Delete an assessment (admin only)
export const remove = mutation({
  args: { id: v.id("assessments") },
  handler: async (ctx, args) => {
    // Get the auth context (including orgId) and require admin role
    const { orgId, userId } = await requireOrgRole(ctx, "admin")

    // Get the assessment
    const assessment = await ctx.db.get(args.id)

    // Verify that the assessment exists and belongs to the current organization
    if (!assessment || assessment.orgId !== orgId) {
      throw new Error("Assessment not found or access denied")
    }

    // Delete the assessment
    await ctx.db.delete(args.id)

    // Log the action
    await ctx.db.insert("auditLogs", {
      orgId,
      userId,
      action: "deleteAssessment",
      resourceType: "assessment",
      resourceId: args.id,
      createdAt: Date.now(),
    })

    return args.id
  },
})
