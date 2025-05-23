import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireAuth } from "./utils/auth"
import { PricingEngine, createDamageAssessmentFromAI } from "../lib/pricing/pricing-engine"
import type { VehicleInfo, DamageAssessment, ServiceOptions, TenantPricing } from "../lib/pricing/pricing-engine"

// Get tenant pricing configuration
export const getTenantPricing = query({
  args: {},
  handler: async (ctx) => {
    const { orgId } = await requireAuth(ctx)

    const pricing = await ctx.db
      .query("tenantPricing")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .first()

    if (!pricing) {
      // Return default pricing if none configured
      return {
        basePricing: {
          basePrice: 150,
          pricePerHour: 75,
          minimumPrice: 50,
          maximumPrice: 1000,
        },
        locationMultiplier: 1.0,
        seasonalMultiplier: 1.0,
        competitorAdjustment: 1.0,
        profitMargin: 0.25,
      }
    }

    return pricing
  },
})

// Update tenant pricing configuration
export const updateTenantPricing = mutation({
  args: {
    basePricing: v.object({
      basePrice: v.number(),
      pricePerHour: v.number(),
      minimumPrice: v.number(),
      maximumPrice: v.number(),
    }),
    locationMultiplier: v.number(),
    seasonalMultiplier: v.number(),
    competitorAdjustment: v.number(),
    profitMargin: v.number(),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await requireAuth(ctx)

    const existing = await ctx.db
      .query("tenantPricing")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        ...args,
        updatedAt: Date.now(),
        updatedBy: userId,
      })
      return existing._id
    } else {
      return await ctx.db.insert("tenantPricing", {
        orgId,
        ...args,
        createdAt: Date.now(),
        createdBy: userId,
        updatedAt: Date.now(),
        updatedBy: userId,
      })
    }
  },
})

// Calculate pricing estimate for a vehicle assessment
export const calculatePricingEstimate = mutation({
  args: {
    vehicleId: v.id("vehicles"),
    assessmentId: v.optional(v.id("assessments")),
    serviceOptions: v.object({
      duration: v.string(),
      includeInterior: v.boolean(),
      includeExterior: v.boolean(),
      includeEngine: v.boolean(),
      includeWheels: v.boolean(),
      additionalServices: v.array(v.string()),
      urgency: v.string(),
    }),
    overrideDamageAssessment: v.optional(
      v.object({
        exteriorDamage: v.object({
          severity: v.string(),
          types: v.array(v.string()),
          count: v.number(),
          requiresSpecialTreatment: v.boolean(),
        }),
        interiorCondition: v.object({
          cleanliness: v.string(),
          materialType: v.string(),
          hasStains: v.boolean(),
          hasOdors: v.boolean(),
          hasPetHair: v.boolean(),
        }),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await requireAuth(ctx)

    // Get vehicle information
    const vehicle = await ctx.db.get(args.vehicleId)
    if (!vehicle || vehicle.orgId !== orgId) {
      throw new Error("Vehicle not found or access denied")
    }

    // Get tenant pricing configuration
    const tenantPricing = await ctx.db
      .query("tenantPricing")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .first()

    const defaultPricing: TenantPricing = {
      basePricing: {
        basePrice: 150,
        pricePerHour: 75,
        minimumPrice: 50,
        maximumPrice: 1000,
      },
      locationMultiplier: 1.0,
      seasonalMultiplier: 1.0,
      competitorAdjustment: 1.0,
      profitMargin: 0.25,
    }

    const pricing = tenantPricing || defaultPricing

    // Create vehicle info object
    const vehicleInfo: VehicleInfo = {
      make: vehicle.make,
      model: vehicle.model,
      year: vehicle.year,
      bodyType: (vehicle.bodyType as any) || "sedan",
      size: (vehicle.size as any) || "midsize",
      color: vehicle.color,
    }

    // Get damage assessment
    let damageAssessment: DamageAssessment

    if (args.overrideDamageAssessment) {
      damageAssessment = args.overrideDamageAssessment as DamageAssessment
    } else {
      // Try to get AI analysis results
      let exteriorAnalysis = null
      let interiorAnalysis = null

      if (args.assessmentId) {
        const exteriorResult = await ctx.db
          .query("aiAnalysisResults")
          .withIndex("by_assessmentId", (q) => q.eq("assessmentId", args.assessmentId))
          .filter((q) => q.eq(q.field("analysisType"), "exterior"))
          .first()

        const interiorResult = await ctx.db
          .query("aiAnalysisResults")
          .withIndex("by_assessmentId", (q) => q.eq("assessmentId", args.assessmentId))
          .filter((q) => q.eq(q.field("analysisType"), "interior"))
          .first()

        exteriorAnalysis = exteriorResult?.results
        interiorAnalysis = interiorResult?.results
      }

      // Create damage assessment from AI results or defaults
      damageAssessment = createDamageAssessmentFromAI(exteriorAnalysis, interiorAnalysis, vehicleInfo)
    }

    // Create service options
    const serviceOptions: ServiceOptions = {
      duration: args.serviceOptions.duration as any,
      includeInterior: args.serviceOptions.includeInterior,
      includeExterior: args.serviceOptions.includeExterior,
      includeEngine: args.serviceOptions.includeEngine,
      includeWheels: args.serviceOptions.includeWheels,
      additionalServices: args.serviceOptions.additionalServices,
      urgency: args.serviceOptions.urgency as any,
    }

    // Calculate estimate
    const pricingEngine = new PricingEngine(pricing)
    const estimate = pricingEngine.calculateEstimate(vehicleInfo, damageAssessment, serviceOptions)

    // Save the estimate
    const estimateId = await ctx.db.insert("pricingEstimates", {
      orgId,
      vehicleId: args.vehicleId,
      assessmentId: args.assessmentId,
      vehicleInfo,
      damageAssessment,
      serviceOptions,
      estimate,
      createdBy: userId,
      createdAt: Date.now(),
    })

    return {
      estimateId,
      estimate,
    }
  },
})

// Get pricing estimates for a vehicle
export const getPricingEstimates = query({
  args: {
    vehicleId: v.id("vehicles"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx)

    const estimates = await ctx.db
      .query("pricingEstimates")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.vehicleId))
      .filter((q) => q.eq(q.field("orgId"), orgId))
      .order("desc")
      .take(args.limit || 10)
      .collect()

    return estimates
  },
})

// Get pricing estimate by ID
export const getPricingEstimate = query({
  args: { estimateId: v.id("pricingEstimates") },
  handler: async (ctx, args) => {
    const { orgId } = await requireAuth(ctx)

    const estimate = await ctx.db.get(args.estimateId)
    if (!estimate || estimate.orgId !== orgId) {
      throw new Error("Pricing estimate not found or access denied")
    }

    return estimate
  },
})

// Update pricing estimate status (e.g., approved, rejected)
export const updateEstimateStatus = mutation({
  args: {
    estimateId: v.id("pricingEstimates"),
    status: v.string(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { orgId, userId } = await requireAuth(ctx)

    const estimate = await ctx.db.get(args.estimateId)
    if (!estimate || estimate.orgId !== orgId) {
      throw new Error("Pricing estimate not found or access denied")
    }

    await ctx.db.patch(args.estimateId, {
      status: args.status,
      statusNotes: args.notes,
      statusUpdatedBy: userId,
      statusUpdatedAt: Date.now(),
    })

    return args.estimateId
  },
})
