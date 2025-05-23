// Base pricing structure for automotive detailing services
export interface ServicePricing {
  basePrice: number
  pricePerHour: number
  minimumPrice: number
  maximumPrice: number
}

// Vehicle size categories with multipliers
export const VEHICLE_SIZE_MULTIPLIERS = {
  compact: 1.0, // Small cars, hatchbacks
  midsize: 1.2, // Sedans, small SUVs
  large: 1.4, // Large sedans, mid-size SUVs
  xlarge: 1.6, // Full-size SUVs, trucks
  commercial: 2.0, // Vans, commercial vehicles
} as const

// Vehicle body type multipliers
export const BODY_TYPE_MULTIPLIERS = {
  sedan: 1.0,
  hatchback: 0.9,
  coupe: 0.95,
  convertible: 1.3, // More complex due to soft top
  suv: 1.2,
  truck: 1.4, // More surface area, harder to clean
  van: 1.5,
  motorcycle: 0.6,
  rv: 2.5,
} as const

// Damage severity multipliers
export const DAMAGE_SEVERITY_MULTIPLIERS = {
  none: 1.0,
  minor: 1.1, // Light scratches, small scuffs
  moderate: 1.3, // Deeper scratches, small dents
  severe: 1.6, // Major damage requiring special attention
  extensive: 2.0, // Multiple severe damages
} as const

// Cleanliness level multipliers
export const CLEANLINESS_MULTIPLIERS = {
  immaculate: 0.8, // Already clean, minimal work
  clean: 0.9, // Light cleaning needed
  average: 1.0, // Standard cleaning
  dirty: 1.3, // Heavy cleaning required
  filthy: 1.6, // Extensive cleaning, sanitization
  biohazard: 2.2, // Special cleaning protocols
} as const

// Service duration multipliers
export const DURATION_MULTIPLIERS = {
  express: 0.7, // 1-2 hours, basic service
  standard: 1.0, // 3-4 hours, full service
  premium: 1.4, // 5-6 hours, comprehensive
  luxury: 1.8, // 7+ hours, white-glove service
} as const

// Additional service factors
export const SERVICE_FACTORS = {
  interior: {
    leather: 1.2, // Leather requires special care
    fabric: 1.0,
    vinyl: 0.9,
    pet_hair: 1.4, // Pet hair removal
    stains: 1.3, // Stain treatment
    odor: 1.5, // Odor elimination
  },
  exterior: {
    wax: 1.2, // Waxing service
    ceramic: 1.8, // Ceramic coating
    paint_correction: 2.0, // Paint correction
    headlight_restoration: 1.3,
    chrome_polish: 1.1,
  },
  engine: {
    basic: 1.1, // Basic engine cleaning
    detailed: 1.4, // Detailed engine bay
  },
  wheels: {
    basic: 1.0,
    detailed: 1.2, // Wheel well cleaning
    tire_shine: 1.1,
  },
} as const

export interface VehicleInfo {
  make: string
  model: string
  year: number
  bodyType: keyof typeof BODY_TYPE_MULTIPLIERS
  size: keyof typeof VEHICLE_SIZE_MULTIPLIERS
  color?: string
}

export interface DamageAssessment {
  exteriorDamage: {
    severity: keyof typeof DAMAGE_SEVERITY_MULTIPLIERS
    types: string[]
    count: number
    requiresSpecialTreatment: boolean
  }
  interiorCondition: {
    cleanliness: keyof typeof CLEANLINESS_MULTIPLIERS
    materialType: keyof typeof SERVICE_FACTORS.interior
    hasStains: boolean
    hasOdors: boolean
    hasPetHair: boolean
  }
}

export interface ServiceOptions {
  duration: keyof typeof DURATION_MULTIPLIERS
  includeInterior: boolean
  includeExterior: boolean
  includeEngine: boolean
  includeWheels: boolean
  additionalServices: string[]
  urgency: "standard" | "rush" | "emergency" // Rush pricing
}

export interface TenantPricing {
  basePricing: ServicePricing
  locationMultiplier: number // Geographic pricing
  seasonalMultiplier: number // Seasonal demand
  competitorAdjustment: number // Market positioning
  profitMargin: number // Desired profit margin
}

export interface PricingEstimate {
  basePrice: number
  adjustments: {
    vehicleSize: number
    bodyType: number
    damage: number
    cleanliness: number
    duration: number
    services: number
    urgency: number
    location: number
    seasonal: number
  }
  subtotal: number
  taxes: number
  total: number
  estimatedDuration: number // in hours
  breakdown: {
    labor: number
    materials: number
    overhead: number
    profit: number
  }
  confidence: number // 0-1, how confident we are in this estimate
}

export class PricingEngine {
  private tenantPricing: TenantPricing

  constructor(tenantPricing: TenantPricing) {
    this.tenantPricing = tenantPricing
  }

  calculateEstimate(vehicle: VehicleInfo, damage: DamageAssessment, services: ServiceOptions): PricingEstimate {
    const basePrice = this.tenantPricing.basePricing.basePrice

    // Calculate all multipliers
    const vehicleSizeMultiplier = VEHICLE_SIZE_MULTIPLIERS[vehicle.size]
    const bodyTypeMultiplier = BODY_TYPE_MULTIPLIERS[vehicle.bodyType]
    const damageMultiplier = this.calculateDamageMultiplier(damage.exteriorDamage)
    const cleanlinessMultiplier = this.calculateCleanlinessMultiplier(damage.interiorCondition)
    const durationMultiplier = DURATION_MULTIPLIERS[services.duration]
    const servicesMultiplier = this.calculateServicesMultiplier(services, damage.interiorCondition)
    const urgencyMultiplier = this.calculateUrgencyMultiplier(services.urgency)

    // Apply all adjustments
    const adjustments = {
      vehicleSize: vehicleSizeMultiplier,
      bodyType: bodyTypeMultiplier,
      damage: damageMultiplier,
      cleanliness: cleanlinessMultiplier,
      duration: durationMultiplier,
      services: servicesMultiplier,
      urgency: urgencyMultiplier,
      location: this.tenantPricing.locationMultiplier,
      seasonal: this.tenantPricing.seasonalMultiplier,
    }

    // Calculate subtotal
    let subtotal = basePrice
    Object.values(adjustments).forEach((multiplier) => {
      subtotal *= multiplier
    })

    // Apply competitor adjustment and profit margin
    subtotal *= this.tenantPricing.competitorAdjustment
    subtotal *= 1 + this.tenantPricing.profitMargin

    // Ensure within min/max bounds
    subtotal = Math.max(
      this.tenantPricing.basePricing.minimumPrice,
      Math.min(subtotal, this.tenantPricing.basePricing.maximumPrice),
    )

    // Calculate taxes (assuming 8.5% average)
    const taxes = subtotal * 0.085

    // Calculate estimated duration
    const estimatedDuration = this.calculateEstimatedDuration(vehicle, damage, services)

    // Calculate breakdown
    const breakdown = this.calculateBreakdown(subtotal, estimatedDuration)

    // Calculate confidence based on data quality
    const confidence = this.calculateConfidence(vehicle, damage, services)

    return {
      basePrice,
      adjustments,
      subtotal,
      taxes,
      total: subtotal + taxes,
      estimatedDuration,
      breakdown,
      confidence,
    }
  }

  private calculateDamageMultiplier(exteriorDamage: DamageAssessment["exteriorDamage"]): number {
    let multiplier = DAMAGE_SEVERITY_MULTIPLIERS[exteriorDamage.severity]

    // Additional multipliers for specific damage types
    if (exteriorDamage.types.includes("rust")) multiplier *= 1.2
    if (exteriorDamage.types.includes("deep_scratches")) multiplier *= 1.15
    if (exteriorDamage.types.includes("paint_damage")) multiplier *= 1.3
    if (exteriorDamage.requiresSpecialTreatment) multiplier *= 1.4

    // Scale with damage count
    if (exteriorDamage.count > 5) multiplier *= 1.1
    if (exteriorDamage.count > 10) multiplier *= 1.2

    return Math.min(multiplier, 3.0) // Cap at 3x
  }

  private calculateCleanlinessMultiplier(interiorCondition: DamageAssessment["interiorCondition"]): number {
    let multiplier = CLEANLINESS_MULTIPLIERS[interiorCondition.cleanliness]

    // Material type adjustments
    multiplier *= SERVICE_FACTORS.interior[interiorCondition.materialType]

    // Additional factors
    if (interiorCondition.hasStains) multiplier *= SERVICE_FACTORS.interior.stains
    if (interiorCondition.hasOdors) multiplier *= SERVICE_FACTORS.interior.odor
    if (interiorCondition.hasPetHair) multiplier *= SERVICE_FACTORS.interior.pet_hair

    return Math.min(multiplier, 2.5) // Cap at 2.5x
  }

  private calculateServicesMultiplier(
    services: ServiceOptions,
    interiorCondition: DamageAssessment["interiorCondition"],
  ): number {
    let multiplier = 1.0

    // Base service inclusions
    if (!services.includeInterior) multiplier *= 0.7
    if (!services.includeExterior) multiplier *= 0.6
    if (services.includeEngine) multiplier *= SERVICE_FACTORS.engine.basic
    if (services.includeWheels) multiplier *= SERVICE_FACTORS.wheels.detailed

    // Additional services
    services.additionalServices.forEach((service) => {
      switch (service) {
        case "wax":
          multiplier *= SERVICE_FACTORS.exterior.wax
          break
        case "ceramic_coating":
          multiplier *= SERVICE_FACTORS.exterior.ceramic
          break
        case "paint_correction":
          multiplier *= SERVICE_FACTORS.exterior.paint_correction
          break
        case "headlight_restoration":
          multiplier *= SERVICE_FACTORS.exterior.headlight_restoration
          break
        case "engine_detail":
          multiplier *= SERVICE_FACTORS.engine.detailed
          break
      }
    })

    return multiplier
  }

  private calculateUrgencyMultiplier(urgency: ServiceOptions["urgency"]): number {
    switch (urgency) {
      case "rush":
        return 1.3 // 30% rush fee
      case "emergency":
        return 1.6 // 60% emergency fee
      default:
        return 1.0
    }
  }

  private calculateEstimatedDuration(vehicle: VehicleInfo, damage: DamageAssessment, services: ServiceOptions): number {
    // Base duration by service type
    let baseDuration = 2 // hours

    if (services.includeInterior) baseDuration += 1.5
    if (services.includeExterior) baseDuration += 2
    if (services.includeEngine) baseDuration += 1
    if (services.includeWheels) baseDuration += 0.5

    // Adjust for vehicle size
    baseDuration *= VEHICLE_SIZE_MULTIPLIERS[vehicle.size]

    // Adjust for damage and cleanliness
    baseDuration *= Math.min(DAMAGE_SEVERITY_MULTIPLIERS[damage.exteriorDamage.severity], 1.5)
    baseDuration *= Math.min(CLEANLINESS_MULTIPLIERS[damage.interiorCondition.cleanliness], 1.4)

    // Duration service level
    baseDuration *= DURATION_MULTIPLIERS[services.duration]

    return Math.round(baseDuration * 10) / 10 // Round to 1 decimal
  }

  private calculateBreakdown(subtotal: number, duration: number): PricingEstimate["breakdown"] {
    const hourlyRate = this.tenantPricing.basePricing.pricePerHour
    const labor = duration * hourlyRate
    const materials = subtotal * 0.15 // 15% materials
    const overhead = subtotal * 0.2 // 20% overhead
    const profit = subtotal - labor - materials - overhead

    return {
      labor: Math.max(labor, 0),
      materials: Math.max(materials, 0),
      overhead: Math.max(overhead, 0),
      profit: Math.max(profit, 0),
    }
  }

  private calculateConfidence(vehicle: VehicleInfo, damage: DamageAssessment, services: ServiceOptions): number {
    let confidence = 1.0

    // Reduce confidence for older vehicles (less predictable)
    const age = new Date().getFullYear() - vehicle.year
    if (age > 10) confidence *= 0.9
    if (age > 20) confidence *= 0.8

    // Reduce confidence for severe damage (more unpredictable)
    if (damage.exteriorDamage.severity === "severe") confidence *= 0.85
    if (damage.exteriorDamage.severity === "extensive") confidence *= 0.7

    // Reduce confidence for very dirty interiors
    if (damage.interiorCondition.cleanliness === "filthy") confidence *= 0.8
    if (damage.interiorCondition.cleanliness === "biohazard") confidence *= 0.6

    return Math.max(confidence, 0.5) // Minimum 50% confidence
  }
}

// Utility function to analyze AI results and create damage assessment
export function createDamageAssessmentFromAI(
  exteriorAnalysis: any,
  interiorAnalysis: any,
  vehicleInfo: VehicleInfo,
): DamageAssessment {
  // Process exterior damage
  const exteriorDamages = exteriorAnalysis?.damages || []
  const damageCount = exteriorDamages.length
  const severities = exteriorDamages.map((d: any) => d.severity)

  let overallSeverity: keyof typeof DAMAGE_SEVERITY_MULTIPLIERS = "none"
  if (damageCount === 0) overallSeverity = "none"
  else if (severities.includes("severe")) overallSeverity = damageCount > 3 ? "extensive" : "severe"
  else if (severities.includes("moderate")) overallSeverity = "moderate"
  else overallSeverity = "minor"

  const damageTypes = exteriorDamages.map((d: any) => d.type)
  const requiresSpecialTreatment = damageTypes.some((type: string) =>
    ["rust", "deep_scratches", "paint_damage", "collision_damage"].includes(type),
  )

  // Process interior condition
  const interiorIssues = interiorAnalysis?.issues || []
  const cleanliness = interiorAnalysis?.overallCleanliness?.toLowerCase() || "average"

  // Map AI cleanliness to our scale
  let cleanlinessLevel: keyof typeof CLEANLINESS_MULTIPLIERS = "average"
  if (cleanliness.includes("immaculate")) cleanlinessLevel = "immaculate"
  else if (cleanliness.includes("clean")) cleanlinessLevel = "clean"
  else if (cleanliness.includes("dirty")) cleanlinessLevel = "dirty"
  else if (cleanliness.includes("filthy")) cleanlinessLevel = "filthy"

  // Detect material type (default to fabric)
  let materialType: keyof typeof SERVICE_FACTORS.interior = "fabric"
  if (vehicleInfo.make.toLowerCase().includes("luxury") || vehicleInfo.year > 2020) {
    materialType = "leather"
  }

  const hasStains = interiorIssues.some((issue: any) => issue.type?.toLowerCase().includes("stain"))
  const hasOdors = interiorIssues.some(
    (issue: any) => issue.type?.toLowerCase().includes("odor") || issue.type?.toLowerCase().includes("smell"),
  )
  const hasPetHair = interiorIssues.some(
    (issue: any) => issue.type?.toLowerCase().includes("pet") || issue.type?.toLowerCase().includes("hair"),
  )

  return {
    exteriorDamage: {
      severity: overallSeverity,
      types: damageTypes,
      count: damageCount,
      requiresSpecialTreatment,
    },
    interiorCondition: {
      cleanliness: cleanlinessLevel,
      materialType,
      hasStains,
      hasOdors,
      hasPetHair,
    },
  }
}
