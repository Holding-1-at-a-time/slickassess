import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireAuth, requireOrgRole } from "./utils/auth"
import { ConvexError } from "convex-dev/server"

// Vehicle size categories for pricing
const VEHICLE_SIZE_MULTIPLIERS = {
  compact: 1.0,
  midsize: 1.2,
  fullsize: 1.4,
  suv: 1.6,
  truck: 1.8,
  van: 2.0,
  luxury: 2.2,
  exotic: 3.0,
} as const

// Damage severity multipliers
const DAMAGE_SEVERITY_MULTIPLIERS = {
  none: 1.0,
  minor: 1.15,
  moderate: 1.35,
  severe: 1.65,
  extensive: 2.0,
} as const

// Filthiness level multipliers
const FILTHINESS_MULTIPLIERS = {
  clean: 1.0,
  light: 1.1,
  moderate: 1.25,
  heavy: 1.5,
  extreme: 2.0,
} as const

// Service duration multipliers (hours)
const DURATION_MULTIPLIERS = {
  quick: 1.0, // 1-2 hours
  standard: 1.2, // 2-4 hours
  detailed: 1.5, // 4-6 hours
  comprehensive: 2.0, // 6+ hours
} as const

// Create or update pricing configuration for a tenant
export const updatePricingConfig = mutation({
  args: {
    tenantId: v.id("tenants"),
    basePrices: v.object({
      exteriorWash: v.number(),
      interiorCleaning: v.number(),
      waxing: v.number(),
      detailing: v.number(),
      paintCorrection: v.number(),
      ceramicCoating: v.number(),
      engineCleaning: v.number(),
      headlightRestoration: v.number(),
      scratchRepair: v.number(),
      dentRepair: v.number(),
    }),
    laborRate: v.number(), // per hour
    markupPercentage: v.number(), // profit margin
    minimumCharge: v.number(),
    rushOrderMultiplier: v.number(),
    discountThresholds: v.object({
      volume: v.object({
        threshold: v.number(),
        discount: v.number(),
      }),
      loyalty: v.object({
        threshold: v.number(),
        discount: v.number(),
      }),
    }),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await requireOrgRole(ctx, "admin")

    // Verify tenant belongs to organization
    const tenant = await ctx.db.get(args.tenantId)
    if (!tenant || tenant.orgId !== orgId) {
      throw new ConvexError("Tenant not found or access denied")
    }

    // Check if pricing config already exists
    const existingConfig = await ctx.db
      .query("pricingConfigurations")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first()

    const configData = {
      tenantId: args.tenantId,
      orgId,
      basePrices: args.basePrices,
      laborRate: args.laborRate,
      markupPercentage: args.markupPercentage,
      minimumCharge: args.minimumCharge,
      rushOrderMultiplier: args.rushOrderMultiplier,
      discountThresholds: args.discountThresholds,
      updatedAt: Date.now(),
      updatedBy: userId,
    }

    if (existingConfig) {
      await ctx.db.patch(existingConfig._id, configData)
      return existingConfig._id
    } else {
      const configId = await ctx.db.insert("pricingConfigurations", {
        ...configData,
        createdAt: Date.now(),
        createdBy: userId,
      })
      return configId
    }
  },
})

// Get pricing configuration for a tenant
export const getPricingConfig = query({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx)

    // Verify tenant belongs to organization
    const tenant = await ctx.db.get(args.tenantId)
    if (!tenant || tenant.orgId !== orgId) {
      throw new ConvexError("Tenant not found or access denied")
    }

    const config = await ctx.db
      .query("pricingConfigurations")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first()

    return config
  },
})

// Calculate dynamic pricing for services
export const calculateServicePricing = mutation({
  args: {
    tenantId: v.id("tenants"),
    vehicleId: v.id("vehicles"),
    assessmentId: v.optional(v.id("assessments")),
    requestedServices: v.array(v.string()),
    vehicleSize: v.string(),
    estimatedDuration: v.string(), // quick, standard, detailed, comprehensive
    filthiness: v.string(), // clean, light, moderate, heavy, extreme
    isRushOrder: v.boolean(),
    clientId: v.optional(v.id("clients")),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await requireAuth(ctx)

    // Get pricing configuration
    const pricingConfig = await ctx.db
      .query("pricingConfigurations")
      .withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))
      .first()

    if (!pricingConfig) {
      throw new ConvexError("Pricing configuration not found for this tenant")
    }

    // Get vehicle information
    const vehicle = await ctx.db.get(args.vehicleId)
    if (!vehicle || vehicle.orgId !== orgId) {
      throw new ConvexError("Vehicle not found or access denied")
    }

    // Get assessment data if provided
    let damageAssessment = null
    if (args.assessmentId) {
      const assessment = await ctx.db.get(args.assessmentId)
      if (assessment && assessment.orgId === orgId) {
        damageAssessment = assessment
      }
    }

    // Calculate damage severity
    const damageSeverity = calculateDamageSeverity(damageAssessment)

    // Get base prices for requested services
    let baseTotal = 0
    const serviceBreakdown: Array<{
      service: string
      basePrice: number
      adjustedPrice: number
      multipliers: Record<string, number>
    }> = []

    for (const service of args.requestedServices) {
      const basePrice = pricingConfig.basePrices[service as keyof typeof pricingConfig.basePrices] || 0
      if (basePrice === 0) continue

      // Apply multipliers
      const vehicleSizeMultiplier =
        VEHICLE_SIZE_MULTIPLIERS[args.vehicleSize as keyof typeof VEHICLE_SIZE_MULTIPLIERS] || 1.0
      const damageMultiplier =
        DAMAGE_SEVERITY_MULTIPLIERS[damageSeverity as keyof typeof DAMAGE_SEVERITY_MULTIPLIERS] || 1.0
      const filthinessMultiplier = FILTHINESS_MULTIPLIERS[args.filthiness as keyof typeof FILTHINESS_MULTIPLIERS] || 1.0
      const durationMultiplier =
        DURATION_MULTIPLIERS[args.estimatedDuration as keyof typeof DURATION_MULTIPLIERS] || 1.0

      // Calculate service-specific adjustments
      let serviceSpecificMultiplier = 1.0

      // Paint correction and scratch repair are more affected by damage
      if ((service === "paintCorrection" || service === "scratchRepair") && damageSeverity !== "none") {
        serviceSpecificMultiplier *= 1.3
      }

      // Interior cleaning is more affected by filthiness
      if (service === "interiorCleaning") {
        serviceSpecificMultiplier *= filthinessMultiplier * 0.5 + 0.5 // Reduce impact slightly
      }

      // Luxury vehicle premium for certain services
      if (args.vehicleSize === "luxury" || args.vehicleSize === "exotic") {
        if (["detailing", "ceramicCoating", "paintCorrection"].includes(service)) {
          serviceSpecificMultiplier *= 1.2
        }
      }

      const totalMultiplier =
        vehicleSizeMultiplier * damageMultiplier * filthinessMultiplier * durationMultiplier * serviceSpecificMultiplier

      const adjustedPrice = basePrice * totalMultiplier

      serviceBreakdown.push({
        service,
        basePrice,
        adjustedPrice,
        multipliers: {
          vehicleSize: vehicleSizeMultiplier,
          damage: damageMultiplier,
          filthiness: filthinessMultiplier,
          duration: durationMultiplier,
          serviceSpecific: serviceSpecificMultiplier,
          total: totalMultiplier,
        },
      })

      baseTotal += adjustedPrice
    }

    // Apply rush order multiplier
    if (args.isRushOrder) {
      baseTotal *= pricingConfig.rushOrderMultiplier
    }

    // Apply markup
    const subtotal = baseTotal * (1 + pricingConfig.markupPercentage / 100)

    // Check for discounts
    let discountAmount = 0
    let discountType = ""

    if (args.clientId) {
      // Check client history for volume and loyalty discounts
      const clientAssessments = await ctx.db
        .query("assessments")
        .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
        .collect()

      // Volume discount
      if (clientAssessments.length >= pricingConfig.discountThresholds.volume.threshold) {
        const volumeDiscount = subtotal * (pricingConfig.discountThresholds.volume.discount / 100)
        if (volumeDiscount > discountAmount) {
          discountAmount = volumeDiscount
          discountType = "volume"
        }
      }

      // Loyalty discount (based on client age)
      const client = await ctx.db.get(args.clientId)
      if (client) {
        const clientAgeMonths = (Date.now() - client.createdAt) / (1000 * 60 * 60 * 24 * 30)
        if (clientAgeMonths >= pricingConfig.discountThresholds.loyalty.threshold) {
          const loyaltyDiscount = subtotal * (pricingConfig.discountThresholds.loyalty.discount / 100)
          if (loyaltyDiscount > discountAmount) {
            discountAmount = loyaltyDiscount
            discountType = "loyalty"
          }
        }
      }
    }

    // Calculate final total
    let finalTotal = subtotal - discountAmount

    // Apply minimum charge
    if (finalTotal < pricingConfig.minimumCharge) {
      finalTotal = pricingConfig.minimumCharge
    }

    // Calculate estimated labor hours
    const estimatedHours = calculateEstimatedHours(
      args.requestedServices,
      args.vehicleSize,
      damageSeverity,
      args.filthiness,
    )
    const laborCost = estimatedHours * pricingConfig.laborRate

    // Save pricing estimate
    const estimateId = await ctx.db.insert("pricingEstimates", {
      tenantId: args.tenantId,
      vehicleId: args.vehicleId,
      assessmentId: args.assessmentId,
      clientId: args.clientId,
      orgId,
      requestedServices: args.requestedServices,
      vehicleSize: args.vehicleSize,
      estimatedDuration: args.estimatedDuration,
      filthiness: args.filthiness,
      damageSeverity,
      isRushOrder: args.isRushOrder,
      serviceBreakdown,
      baseTotal,
      subtotal,
      discountAmount,
      discountType,
      finalTotal,
      estimatedHours,
      laborCost,
      createdBy: userId,
      createdAt: Date.now(),
      status: "draft",
    })

    return {
      estimateId,
      serviceBreakdown,
      pricing: {
        baseTotal,
        subtotal,
        discountAmount,
        discountType,
        finalTotal,
        estimatedHours,
        laborCost,
        isRushOrder: args.isRushOrder,
        rushMultiplier: args.isRushOrder ? pricingConfig.rushOrderMultiplier : 1.0,
      },
      factors: {
        vehicleSize: args.vehicleSize,
        damageSeverity,
        filthiness: args.filthiness,
        estimatedDuration: args.estimatedDuration,
      },
    }
  },
})

// Get pricing estimates for a vehicle
export const getVehiclePricingEstimates = query({
  args: { vehicleId: v.id("vehicles") },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx)

    // Verify vehicle belongs to organization
    const vehicle = await ctx.db.get(args.vehicleId)
    if (!vehicle || vehicle.orgId !== orgId) {
      throw new ConvexError("Vehicle not found or access denied")
    }

    const estimates = await ctx.db
      .query("pricingEstimates")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
      .order("desc")
      .collect()

    return estimates
  },
})

// Approve pricing estimate
export const approvePricingEstimate = mutation({
  args: { estimateId: v.id("pricingEstimates") },
  handler: async (ctx, args) => {
    const { orgId, userId } = await requireAuth(ctx)

    const estimate = await ctx.db.get(args.estimateId)
    if (!estimate || estimate.orgId !== orgId) {
      throw new ConvexError("Estimate not found or access denied")
    }

    await ctx.db.patch(args.estimateId, {
      status: "approved",
      approvedBy: userId,
      approvedAt: Date.now(),
    })

    return args.estimateId
  },
})

// Helper function to calculate damage severity from assessment
function calculateDamageSeverity(assessment: any): string {
  if (!assessment || !assessment.identifiedIssues) {
    return "none"
  }

  const issues = assessment.identifiedIssues
  if (issues.length === 0) return "none"

  // Count issues by severity
  const severityCounts = {
    minor: 0,
    moderate: 0,
    severe: 0,
  }

  for (const issue of issues) {
    if (issue.severity in severityCounts) {
      severityCounts[issue.severity as keyof typeof severityCounts]++
    }
  }

  // Determine overall severity
  if (severityCounts.severe > 3 || (severityCounts.severe > 1 && severityCounts.moderate > 2)) {
    return "extensive"
  } else if (severityCounts.severe > 1 || severityCounts.moderate > 3) {
    return "severe"
  } else if (severityCounts.severe > 0 || severityCounts.moderate > 1) {
    return "moderate"
  } else if (severityCounts.minor > 0 || severityCounts.moderate > 0) {
    return "minor"
  }

  return "none"
}

// Helper function to calculate estimated hours
function calculateEstimatedHours(
  services: string[],
  vehicleSize: string,
  damageSeverity: string,
  filthiness: string,
): number {
  const baseHours: Record<string, number> = {
    exteriorWash: 1.0,
    interiorCleaning: 1.5,
    waxing: 2.0,
    detailing: 4.0,
    paintCorrection: 6.0,
    ceramicCoating: 8.0,
    engineCleaning: 2.0,
    headlightRestoration: 1.0,
    scratchRepair: 2.0,
    dentRepair: 3.0,
  }

  let totalHours = 0

  for (const service of services) {
    const baseTime = baseHours[service] || 1.0

    // Apply multipliers
    const sizeMultiplier = VEHICLE_SIZE_MULTIPLIERS[vehicleSize as keyof typeof VEHICLE_SIZE_MULTIPLIERS] || 1.0
    const damageMultiplier =
      DAMAGE_SEVERITY_MULTIPLIERS[damageSeverity as keyof typeof DAMAGE_SEVERITY_MULTIPLIERS] || 1.0
    const filthinessMultiplier = FILTHINESS_MULTIPLIERS[filthiness as keyof typeof FILTHINESS_MULTIPLIERS] || 1.0

    totalHours += baseTime * sizeMultiplier * damageMultiplier * filthinessMultiplier
  }

  return Math.round(totalHours * 10) / 10 // Round to 1 decimal place
}

// Get pricing analytics
export const getPricingAnalytics = query({
  args: {
    tenantId: v.id("tenants"),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx)

    // Verify tenant belongs to organization
    const tenant = await ctx.db.get(args.tenantId)
    if (!tenant || tenant.orgId !== orgId) {
      throw new ConvexError("Tenant not found or access denied")
    }

    let query = ctx.db.query("pricingEstimates").withIndex("by_tenantId", (q) => q.eq("tenantId", args.tenantId))

    if (args.startDate) {
      query = query.filter((q) => q.gte(q.field("createdAt"), args.startDate!))
    }

    if (args.endDate) {
      query = query.filter((q) => q.lte(q.field("createdAt"), args.endDate!))
    }

    const estimates = await query.collect()

    // Calculate analytics
    const totalEstimates = estimates.length
    const approvedEstimates = estimates.filter((e) => e.status === "approved").length
    const totalRevenue = estimates.filter((e) => e.status === "approved").reduce((sum, e) => sum + e.finalTotal, 0)
    const averageEstimate =
      totalEstimates > 0 ? estimates.reduce((sum, e) => sum + e.finalTotal, 0) / totalEstimates : 0

    // Service popularity
    const servicePopularity: Record<string, number> = {}
    estimates.forEach((estimate) => {
      estimate.requestedServices.forEach((service) => {
        servicePopularity[service] = (servicePopularity[service] || 0) + 1
      })
    })

    // Vehicle size distribution
    const vehicleSizeDistribution: Record<string, number> = {}
    estimates.forEach((estimate) => {
      vehicleSizeDistribution[estimate.vehicleSize] = (vehicleSizeDistribution[estimate.vehicleSize] || 0) + 1
    })

    return {
      totalEstimates,
      approvedEstimates,
      conversionRate: totalEstimates > 0 ? (approvedEstimates / totalEstimates) * 100 : 0,
      totalRevenue,
      averageEstimate,
      servicePopularity,
      vehicleSizeDistribution,
    }
  },
})
