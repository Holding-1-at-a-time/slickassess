import { describe, it, expect, beforeEach } from "@jest/globals"
import {
  PricingEngine,
  VEHICLE_SIZE_MULTIPLIERS,
  DAMAGE_SEVERITY_MULTIPLIERS,
  CLEANLINESS_MULTIPLIERS,
  createDamageAssessmentFromAI,
  type VehicleInfo,
  type DamageAssessment,
  type ServiceOptions,
  type TenantPricing,
} from "../lib/pricing/pricing-engine"

describe("PricingEngine", () => {
  let pricingEngine: PricingEngine
  let mockTenantPricing: TenantPricing
  let mockVehicle: VehicleInfo
  let mockDamage: DamageAssessment
  let mockServices: ServiceOptions

  beforeEach(() => {
    mockTenantPricing = {
      basePricing: {
        basePrice: 100,
        pricePerHour: 50,
        minimumPrice: 75,
        maximumPrice: 500,
      },
      locationMultiplier: 1.0,
      seasonalMultiplier: 1.0,
      competitorAdjustment: 1.0,
      profitMargin: 0.2,
    }

    mockVehicle = {
      make: "Toyota",
      model: "Camry",
      year: 2020,
      bodyType: "sedan",
      size: "midsize",
      color: "white",
    }

    mockDamage = {
      exteriorDamage: {
        severity: "minor",
        types: ["scratch"],
        count: 2,
        requiresSpecialTreatment: false,
      },
      interiorCondition: {
        cleanliness: "average",
        materialType: "fabric",
        hasStains: false,
        hasOdors: false,
        hasPetHair: false,
      },
    }

    mockServices = {
      duration: "standard",
      includeInterior: true,
      includeExterior: true,
      includeEngine: false,
      includeWheels: false,
      additionalServices: [],
      urgency: "standard",
    }

    pricingEngine = new PricingEngine(mockTenantPricing)
  })

  describe("calculateEstimate", () => {
    it("should calculate basic estimate correctly", () => {
      const estimate = pricingEngine.calculateEstimate(mockVehicle, mockDamage, mockServices)

      expect(estimate.basePrice).toBe(100)
      expect(estimate.total).toBeGreaterThan(estimate.subtotal)
      expect(estimate.estimatedDuration).toBeGreaterThan(0)
      expect(estimate.confidence).toBeGreaterThan(0)
      expect(estimate.confidence).toBeLessThanOrEqual(1)
    })

    it("should apply vehicle size multiplier correctly", () => {
      const compactVehicle = { ...mockVehicle, size: "compact" as const }
      const xlargeVehicle = { ...mockVehicle, size: "xlarge" as const }

      const compactEstimate = pricingEngine.calculateEstimate(compactVehicle, mockDamage, mockServices)
      const xlargeEstimate = pricingEngine.calculateEstimate(xlargeVehicle, mockDamage, mockServices)

      expect(xlargeEstimate.subtotal).toBeGreaterThan(compactEstimate.subtotal)
      expect(compactEstimate.adjustments.vehicleSize).toBe(VEHICLE_SIZE_MULTIPLIERS.compact)
      expect(xlargeEstimate.adjustments.vehicleSize).toBe(VEHICLE_SIZE_MULTIPLIERS.xlarge)
    })

    it("should apply damage severity multiplier correctly", () => {
      const severeDamage = {
        ...mockDamage,
        exteriorDamage: {
          ...mockDamage.exteriorDamage,
          severity: "severe" as const,
        },
      }

      const minorEstimate = pricingEngine.calculateEstimate(mockVehicle, mockDamage, mockServices)
      const severeEstimate = pricingEngine.calculateEstimate(mockVehicle, severeDamage, mockServices)

      expect(severeEstimate.subtotal).toBeGreaterThan(minorEstimate.subtotal)
      expect(severeEstimate.adjustments.damage).toBeGreaterThan(minorEstimate.adjustments.damage)
    })

    it("should respect minimum and maximum price bounds", () => {
      // Test minimum price
      const lowPricingEngine = new PricingEngine({
        ...mockTenantPricing,
        basePricing: {
          ...mockTenantPricing.basePricing,
          basePrice: 10,
          minimumPrice: 75,
        },
      })

      const lowEstimate = lowPricingEngine.calculateEstimate(mockVehicle, mockDamage, mockServices)
      expect(lowEstimate.subtotal).toBeGreaterThanOrEqual(75)

      // Test maximum price
      const highPricingEngine = new PricingEngine({
        ...mockTenantPricing,
        basePricing: {
          ...mockTenantPricing.basePricing,
          basePrice: 1000,
          maximumPrice: 500,
        },
      })

      const highEstimate = highPricingEngine.calculateEstimate(mockVehicle, mockDamage, mockServices)
      expect(highEstimate.subtotal).toBeLessThanOrEqual(500)
    })

    it("should calculate taxes correctly", () => {
      const estimate = pricingEngine.calculateEstimate(mockVehicle, mockDamage, mockServices)
      const expectedTaxes = estimate.subtotal * 0.085

      expect(estimate.taxes).toBeCloseTo(expectedTaxes, 2)
      expect(estimate.total).toBeCloseTo(estimate.subtotal + estimate.taxes, 2)
    })

    it("should handle rush pricing correctly", () => {
      const rushServices = { ...mockServices, urgency: "rush" as const }
      const emergencyServices = { ...mockServices, urgency: "emergency" as const }

      const standardEstimate = pricingEngine.calculateEstimate(mockVehicle, mockDamage, mockServices)
      const rushEstimate = pricingEngine.calculateEstimate(mockVehicle, mockDamage, rushServices)
      const emergencyEstimate = pricingEngine.calculateEstimate(mockVehicle, mockDamage, emergencyServices)

      expect(rushEstimate.adjustments.urgency).toBe(1.3)
      expect(emergencyEstimate.adjustments.urgency).toBe(1.6)
      expect(rushEstimate.subtotal).toBeGreaterThan(standardEstimate.subtotal)
      expect(emergencyEstimate.subtotal).toBeGreaterThan(rushEstimate.subtotal)
    })

    it("should calculate breakdown correctly", () => {
      const estimate = pricingEngine.calculateEstimate(mockVehicle, mockDamage, mockServices)

      expect(estimate.breakdown.labor).toBeGreaterThan(0)
      expect(estimate.breakdown.materials).toBeGreaterThan(0)
      expect(estimate.breakdown.overhead).toBeGreaterThan(0)
      expect(estimate.breakdown.profit).toBeGreaterThan(0)

      const total =
        estimate.breakdown.labor +
        estimate.breakdown.materials +
        estimate.breakdown.overhead +
        estimate.breakdown.profit
      expect(total).toBeCloseTo(estimate.subtotal, 1)
    })
  })

  describe("createDamageAssessmentFromAI", () => {
    it("should create damage assessment from AI analysis", () => {
      const mockExteriorAnalysis = {
        damages: [
          { severity: "moderate", type: "scratch" },
          { severity: "minor", type: "dent" },
        ],
      }

      const mockInteriorAnalysis = {
        overallCleanliness: "Clean",
        issues: [{ type: "stain" }, { type: "pet hair" }],
      }

      const assessment = createDamageAssessmentFromAI(mockExteriorAnalysis, mockInteriorAnalysis, mockVehicle)

      expect(assessment.exteriorDamage.severity).toBe("moderate")
      expect(assessment.exteriorDamage.count).toBe(2)
      expect(assessment.interiorCondition.cleanliness).toBe("clean")
      expect(assessment.interiorCondition.hasStains).toBe(true)
      expect(assessment.interiorCondition.hasPetHair).toBe(true)
    })

    it("should handle empty AI analysis", () => {
      const assessment = createDamageAssessmentFromAI({}, {}, mockVehicle)

      expect(assessment.exteriorDamage.severity).toBe("none")
      expect(assessment.exteriorDamage.count).toBe(0)
      expect(assessment.interiorCondition.cleanliness).toBe("average")
    })
  })
})

describe("Pricing Constants", () => {
  it("should have valid vehicle size multipliers", () => {
    expect(VEHICLE_SIZE_MULTIPLIERS.compact).toBe(1.0)
    expect(VEHICLE_SIZE_MULTIPLIERS.xlarge).toBeGreaterThan(VEHICLE_SIZE_MULTIPLIERS.compact)
    expect(VEHICLE_SIZE_MULTIPLIERS.commercial).toBeGreaterThan(VEHICLE_SIZE_MULTIPLIERS.xlarge)
  })

  it("should have valid damage severity multipliers", () => {
    expect(DAMAGE_SEVERITY_MULTIPLIERS.none).toBe(1.0)
    expect(DAMAGE_SEVERITY_MULTIPLIERS.extensive).toBeGreaterThan(DAMAGE_SEVERITY_MULTIPLIERS.severe)
    expect(DAMAGE_SEVERITY_MULTIPLIERS.severe).toBeGreaterThan(DAMAGE_SEVERITY_MULTIPLIERS.moderate)
  })

  it("should have valid cleanliness multipliers", () => {
    expect(CLEANLINESS_MULTIPLIERS.immaculate).toBeLessThan(1.0)
    expect(CLEANLINESS_MULTIPLIERS.biohazard).toBeGreaterThan(CLEANLINESS_MULTIPLIERS.filthy)
  })
})
