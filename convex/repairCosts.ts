import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireAuth } from "./utils/auth"
import { ConvexError } from "convex/server"
import { v4 as uuidv4 } from "uuid"

// Get repair costs by damage type and severity
export const getRepairCostsByType = query({
  args: {
    damageType: v.string(),
    severity: v.optional(v.string()),
    location: v.optional(v.string()),
    vehicleType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx)

    let costsQuery = ctx.db.query("repairCosts").withIndex("by_orgId_damageType_severity", (q) => {
      let query = q.eq("orgId", orgId).eq("damageType", args.damageType)
      if (args.severity) {
        query = query.eq("severity", args.severity)
      }
      return query
    })

    if (args.location) {
      costsQuery = costsQuery.filter((q) => q.location === args.location)
    }

    if (args.vehicleType) {
      costsQuery = costsQuery.filter((q) => q.vehicleType === args.vehicleType)
    }

    const costs = await costsQuery.collect()
    return costs
  },
})

// Get all repair costs for an organization
export const getAllRepairCosts = query({
  handler: async (ctx) => {
    const { orgId } = await requireAuth(ctx)

    const costs = await ctx.db
      .query("repairCosts")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .collect()

    return costs
  },
})

// Add or update a repair cost entry
export const upsertRepairCost = mutation({
  args: {
    id: v.optional(v.id("repairCosts")),
    damageType: v.string(),
    vehicleType: v.string(),
    severity: v.string(),
    location: v.string(),
    minCost: v.number(),
    maxCost: v.number(),
    averageCost: v.number(),
    laborHours: v.optional(v.number()),
    partsCost: v.optional(v.number()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await requireAuth(ctx)
    const now = Date.now()

    // If ID is provided, update existing record
    if (args.id) {
      const existingCost = await ctx.db.get(args.id)
      if (!existingCost) {
        throw new ConvexError("Repair cost record not found")
      }

      if (existingCost.orgId !== orgId) {
        throw new ConvexError("You don't have permission to update this record")
      }

      await ctx.db.patch(args.id, {
        damageType: args.damageType,
        vehicleType: args.vehicleType,
        severity: args.severity,
        location: args.location,
        minCost: args.minCost,
        maxCost: args.maxCost,
        averageCost: args.averageCost,
        laborHours: args.laborHours,
        partsCost: args.partsCost,
        notes: args.notes,
        lastUpdated: now,
      })

      return args.id
    } else {
      // Create new record
      const costId = await ctx.db.insert("repairCosts", {
        orgId,
        damageType: args.damageType,
        vehicleType: args.vehicleType,
        severity: args.severity,
        location: args.location,
        minCost: args.minCost,
        maxCost: args.maxCost,
        averageCost: args.averageCost,
        laborHours: args.laborHours,
        partsCost: args.partsCost,
        notes: args.notes,
        lastUpdated: now,
        createdBy: userId,
        createdAt: now,
      })

      return costId
    }
  },
})

// Delete a repair cost entry
export const deleteRepairCost = mutation({
  args: {
    id: v.id("repairCosts"),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx)

    const cost = await ctx.db.get(args.id)
    if (!cost) {
      throw new ConvexError("Repair cost record not found")
    }

    if (cost.orgId !== orgId) {
      throw new ConvexError("You don't have permission to delete this record")
    }

    await ctx.db.delete(args.id)
    return { success: true }
  },
})

// Generate a cost estimate for an assessment based on AI detected damage
export const generateCostEstimate = mutation({
  args: {
    assessmentId: v.id("assessments"),
    vehicleId: v.id("vehicles"),
    aiAnalysisResults: v.array(
      v.object({
        damageType: v.string(),
        location: v.string(),
        severity: v.string(),
        description: v.string(),
        imageId: v.optional(v.string()),
      }),
    ),
    vehicleType: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await requireAuth(ctx)
    const now = Date.now()

    // Verify assessment exists and belongs to the organization
    const assessment = await ctx.db.get(args.assessmentId)
    if (!assessment || assessment.orgId !== orgId) {
      throw new ConvexError("Assessment not found or access denied")
    }

    // Verify vehicle exists and belongs to the organization
    const vehicle = await ctx.db.get(args.vehicleId)
    if (!vehicle || vehicle.orgId !== orgId) {
      throw new ConvexError("Vehicle not found or access denied")
    }

    // Get vehicle type from vehicle data if not provided
    const vehicleType = args.vehicleType || getVehicleType(vehicle.make, vehicle.model)

    // Calculate cost for each damage item
    const lineItems = []
    let totalEstimate = 0

    for (const damage of args.aiAnalysisResults) {
      // Look up cost data for this damage type
      const costData = await ctx.db
        .query("repairCosts")
        .withIndex("by_orgId_damageType_severity", (q) =>
          q.eq("orgId", orgId).eq("damageType", damage.damageType).eq("severity", damage.severity),
        )
        .first()

      // If no exact match, get the closest match by damage type
      const fallbackCostData = !costData
        ? await ctx.db
            .query("repairCosts")
            .withIndex("by_orgId_damageType_severity", (q) => q.eq("orgId", orgId).eq("damageType", damage.damageType))
            .first()
        : null

      // Use default costs if no data is available
      const costs = costData || fallbackCostData || getDefaultCosts(damage.damageType, damage.severity)

      // Calculate the selected cost (default to average)
      const selectedCost = costs.averageCost || (costs.minCost + costs.maxCost) / 2

      // Add to line items
      lineItems.push({
        id: uuidv4(),
        damageType: damage.damageType,
        location: damage.location,
        severity: damage.severity,
        description: damage.description,
        minCost: costs.minCost,
        maxCost: costs.maxCost,
        selectedCost,
        laborHours: costs.laborHours,
        partsCost: costs.partsCost,
        notes: `AI detected ${damage.severity} ${damage.damageType} on ${damage.location}`,
        imageId: damage.imageId,
        aiDetected: true,
      })

      totalEstimate += selectedCost
    }

    // Check if an estimate already exists for this assessment
    const existingEstimate = await ctx.db
      .query("costEstimates")
      .withIndex("by_assessmentId", (q) => q.eq("assessmentId", args.assessmentId))
      .first()

    if (existingEstimate) {
      // Update existing estimate
      await ctx.db.patch(existingEstimate._id, {
        totalEstimate,
        lineItems,
        notes: args.notes,
        updatedAt: now,
      })

      return existingEstimate._id
    } else {
      // Create new estimate
      const estimateId = await ctx.db.insert("costEstimates", {
        assessmentId: args.assessmentId,
        vehicleId: args.vehicleId,
        orgId,
        totalEstimate,
        lineItems,
        status: "draft",
        notes: args.notes,
        createdBy: userId,
        createdAt: now,
        updatedAt: now,
      })

      return estimateId
    }
  },
})

// Get cost estimate for an assessment
export const getCostEstimate = query({
  args: {
    assessmentId: v.id("assessments"),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx)

    const estimate = await ctx.db
      .query("costEstimates")
      .withIndex("by_assessmentId", (q) => q.eq("assessmentId", args.assessmentId))
      .first()

    if (!estimate || estimate.orgId !== orgId) {
      return null
    }

    return estimate
  },
})

// Update cost estimate status
export const updateEstimateStatus = mutation({
  args: {
    estimateId: v.id("costEstimates"),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx)

    const estimate = await ctx.db.get(args.estimateId)
    if (!estimate || estimate.orgId !== orgId) {
      throw new ConvexError("Cost estimate not found or access denied")
    }

    await ctx.db.patch(args.estimateId, {
      status: args.status,
      notes: args.notes !== undefined ? args.notes : estimate.notes,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

// Update a line item in a cost estimate
export const updateEstimateLineItem = mutation({
  args: {
    estimateId: v.id("costEstimates"),
    lineItemId: v.string(),
    selectedCost: v.optional(v.number()),
    notes: v.optional(v.string()),
    laborHours: v.optional(v.number()),
    partsCost: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx)

    const estimate = await ctx.db.get(args.estimateId)
    if (!estimate || estimate.orgId !== orgId) {
      throw new ConvexError("Cost estimate not found or access denied")
    }

    // Find and update the line item
    const lineItems = estimate.lineItems.map((item) => {
      if (item.id === args.lineItemId) {
        return {
          ...item,
          selectedCost: args.selectedCost !== undefined ? args.selectedCost : item.selectedCost,
          notes: args.notes !== undefined ? args.notes : item.notes,
          laborHours: args.laborHours !== undefined ? args.laborHours : item.laborHours,
          partsCost: args.partsCost !== undefined ? args.partsCost : item.partsCost,
        }
      }
      return item
    })

    // Recalculate total
    const totalEstimate = lineItems.reduce((sum, item) => sum + item.selectedCost, 0)

    await ctx.db.patch(args.estimateId, {
      lineItems,
      totalEstimate,
      updatedAt: Date.now(),
    })

    return { success: true }
  },
})

// Helper function to determine vehicle type
function getVehicleType(make: string, model: string): string {
  // This is a simplified implementation
  // In a real-world scenario, you would have a more comprehensive database
  const make_lower = make.toLowerCase()
  const model_lower = model.toLowerCase()

  // SUVs
  if (
    model_lower.includes("suv") ||
    model_lower.includes("crossover") ||
    model_lower.includes("explorer") ||
    model_lower.includes("highlander") ||
    model_lower.includes("rav4") ||
    model_lower.includes("cr-v") ||
    model_lower.includes("equinox")
  ) {
    return "suv"
  }

  // Trucks
  if (
    model_lower.includes("truck") ||
    model_lower.includes("pickup") ||
    model_lower.includes("f-150") ||
    model_lower.includes("silverado") ||
    model_lower.includes("ram") ||
    model_lower.includes("sierra") ||
    model_lower.includes("tundra") ||
    model_lower.includes("tacoma")
  ) {
    return "truck"
  }

  // Luxury
  if (
    make_lower === "mercedes" ||
    make_lower === "bmw" ||
    make_lower === "audi" ||
    make_lower === "lexus" ||
    make_lower === "porsche" ||
    make_lower === "tesla" ||
    make_lower === "cadillac" ||
    make_lower === "lincoln" ||
    make_lower === "infiniti" ||
    make_lower === "acura"
  ) {
    return "luxury"
  }

  // Default to sedan
  return "sedan"
}

// Helper function to get default costs when no data is available
function getDefaultCosts(damageType: string, severity: string) {
  // Base costs by damage type
  const baseCosts: Record<string, { min: number; max: number }> = {
    scratch: { min: 150, max: 800 },
    dent: { min: 200, max: 1000 },
    rust: { min: 300, max: 1500 },
    crack: { min: 250, max: 1200 },
    broken: { min: 400, max: 2000 },
    missing: { min: 500, max: 2500 },
    tear: { min: 200, max: 800 },
    stain: { min: 100, max: 400 },
    wear: { min: 150, max: 600 },
  }

  // Default to scratch if damage type not found
  const costs = baseCosts[damageType.toLowerCase()] || baseCosts["scratch"]

  // Adjust based on severity
  let multiplier = 1
  switch (severity.toLowerCase()) {
    case "minor":
      multiplier = 0.7
      break
    case "moderate":
      multiplier = 1
      break
    case "severe":
      multiplier = 1.5
      break
    default:
      multiplier = 1
  }

  const minCost = Math.round(costs.min * multiplier)
  const maxCost = Math.round(costs.max * multiplier)
  const averageCost = Math.round((minCost + maxCost) / 2)

  return {
    minCost,
    maxCost,
    averageCost,
    laborHours: Math.round(averageCost / 100), // Rough estimate: 1 hour per $100
  }
}
