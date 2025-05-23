import type { AIAssessmentData } from "@/components/ai-assessment-summary"
import {
  VEHICLE_SIZE_MULTIPLIERS,
  BODY_TYPE_MULTIPLIERS,
  DAMAGE_SEVERITY_MULTIPLIERS,
  CLEANLINESS_MULTIPLIERS,
} from "./pricing-engine"

interface AIAnalysisResults {
  exterior?: {
    overallCondition: string
    damages: Array<{
      type: string
      severity: string
      location: string
      size?: string
      repairComplexity?: string
      boundingBox?: any
    }>
    summary: string
    recommendations?: string[]
  }
  interior?: {
    overallCleanliness: string
    issues: Array<{
      type: string
      severity: string
      location: string
      recommendation: string
    }>
    summary: string
    recommendations?: string[]
  }
}

interface VehicleData {
  make: string
  model: string
  year: number
  bodyType?: string
  size?: string
  color?: string
}

interface PricingData {
  basePrice: number
  estimate: any
}

export function generateAIAssessmentSummary(
  aiResults: AIAnalysisResults,
  vehicleData: VehicleData,
  pricingData: PricingData,
): AIAssessmentData {
  // Process exterior damage
  const exteriorDamages = (aiResults.exterior?.damages || []).map((damage, index) => {
    const severityMultiplier =
      DAMAGE_SEVERITY_MULTIPLIERS[damage.severity as keyof typeof DAMAGE_SEVERITY_MULTIPLIERS] || 1
    const baseImpact = pricingData.basePrice * 0.1 // 10% base impact per damage
    const priceImpact = baseImpact * (severityMultiplier - 1)

    return {
      id: `damage_${index}`,
      type: damage.type,
      severity: damage.severity as "minor" | "moderate" | "severe",
      location: damage.location,
      size: damage.size || "Unknown",
      repairComplexity: damage.repairComplexity || "Standard",
      confidence: 0.85 + Math.random() * 0.1, // Simulated confidence
      priceImpact: Math.max(priceImpact, 0),
      description: generateDamageDescription(damage),
      boundingBox: damage.boundingBox,
    }
  })

  // Process interior issues
  const interiorIssues = (aiResults.interior?.issues || []).map((issue, index) => {
    const severityMultiplier =
      DAMAGE_SEVERITY_MULTIPLIERS[issue.severity as keyof typeof DAMAGE_SEVERITY_MULTIPLIERS] || 1
    const baseImpact = pricingData.basePrice * 0.08 // 8% base impact per interior issue
    const priceImpact = baseImpact * (severityMultiplier - 1)

    return {
      id: `interior_${index}`,
      type: issue.type,
      severity: issue.severity as "minor" | "moderate" | "severe",
      location: issue.location,
      recommendation: issue.recommendation,
      confidence: 0.8 + Math.random() * 0.15,
      priceImpact: Math.max(priceImpact, 0),
      description: generateInteriorDescription(issue),
    }
  })

  // Calculate severity distribution
  const severityDistribution = {
    minor: exteriorDamages.filter((d) => d.severity === "minor").length,
    moderate: exteriorDamages.filter((d) => d.severity === "moderate").length,
    severe: exteriorDamages.filter((d) => d.severity === "severe").length,
  }

  // Generate pricing breakdown
  const pricingBreakdown = generateDetailedPricingBreakdown(
    pricingData,
    vehicleData,
    exteriorDamages,
    interiorIssues,
    aiResults,
  )

  // Generate recommendations
  const recommendations = generateRecommendations(exteriorDamages, interiorIssues, aiResults)

  // Calculate estimated duration
  const estimatedDuration = calculateDetailedDuration(vehicleData, exteriorDamages, interiorIssues)

  // Generate risk factors
  const riskFactors = generateRiskFactors(exteriorDamages, interiorIssues, vehicleData)

  return {
    vehicleInfo: {
      make: vehicleData.make,
      model: vehicleData.model,
      year: vehicleData.year,
      bodyType: vehicleData.bodyType || "sedan",
      size: vehicleData.size || "midsize",
      estimatedValue: estimateVehicleValue(vehicleData),
    },
    exteriorAnalysis: {
      overallCondition: (aiResults.exterior?.overallCondition?.toLowerCase() || "good") as any,
      damages: exteriorDamages,
      paintCondition: generatePaintConditionDescription(aiResults.exterior),
      bodyIntegrity: generateBodyIntegrityDescription(aiResults.exterior),
      confidence: 0.85,
      totalDamageCount: exteriorDamages.length,
      severityDistribution,
    },
    interiorAnalysis: {
      overallCleanliness: (aiResults.interior?.overallCleanliness?.toLowerCase() || "clean") as any,
      issues: interiorIssues,
      materialCondition: generateMaterialConditionDescription(aiResults.interior),
      odorLevel: determineOdorLevel(interiorIssues),
      wearLevel: determineWearLevel(interiorIssues),
      confidence: 0.82,
    },
    pricingBreakdown,
    recommendations,
    estimatedDuration,
    riskFactors,
  }
}

function generateDamageDescription(damage: any): string {
  const descriptions = {
    scratch: `${damage.severity} scratch detected on ${damage.location}`,
    dent: `${damage.severity} dent found on ${damage.location}`,
    rust: `Rust formation identified on ${damage.location}`,
    paint_damage: `Paint damage observed on ${damage.location}`,
    scuff: `Surface scuffing on ${damage.location}`,
    chip: `Paint chip on ${damage.location}`,
  }

  return (
    descriptions[damage.type as keyof typeof descriptions] || `${damage.severity} ${damage.type} on ${damage.location}`
  )
}

function generateInteriorDescription(issue: any): string {
  const descriptions = {
    stain: `${issue.severity} staining detected on ${issue.location}`,
    wear: `${issue.severity} wear patterns on ${issue.location}`,
    tear: `${issue.severity} tear in ${issue.location}`,
    odor: `${issue.severity} odor detected in ${issue.location}`,
    dirt: `${issue.severity} dirt accumulation on ${issue.location}`,
    pet_hair: `Pet hair found on ${issue.location}`,
  }

  return descriptions[issue.type as keyof typeof descriptions] || `${issue.severity} ${issue.type} in ${issue.location}`
}

function generateDetailedPricingBreakdown(
  pricingData: PricingData,
  vehicleData: VehicleData,
  exteriorDamages: any[],
  interiorIssues: any[],
  aiResults: AIAnalysisResults,
) {
  const basePrice = pricingData.basePrice
  const estimate = pricingData.estimate

  // Damage adjustments
  const damageAdjustments = exteriorDamages.map((damage) => ({
    item: `${damage.type} (${damage.severity})`,
    description: `Additional work required for ${damage.location}`,
    multiplier: 1 + damage.priceImpact / basePrice,
    amount: damage.priceImpact,
  }))

  // Cleanliness adjustments
  const cleanlinessLevel = aiResults.interior?.overallCleanliness?.toLowerCase() || "clean"
  const cleanlinessMultiplier = CLEANLINESS_MULTIPLIERS[cleanlinessLevel as keyof typeof CLEANLINESS_MULTIPLIERS] || 1
  const cleanlinessAdjustment = basePrice * (cleanlinessMultiplier - 1)

  const cleanlinessAdjustments =
    cleanlinessAdjustment !== 0
      ? [
          {
            item: `Interior Cleanliness (${cleanlinessLevel})`,
            description: `Adjustment based on current cleanliness level`,
            multiplier: cleanlinessMultiplier,
            amount: cleanlinessAdjustment,
          },
        ]
      : []

  // Add interior issue adjustments
  interiorIssues.forEach((issue) => {
    if (issue.priceImpact > 0) {
      cleanlinessAdjustments.push({
        item: `${issue.type} Treatment`,
        description: `Special treatment for ${issue.location}`,
        multiplier: 1 + issue.priceImpact / basePrice,
        amount: issue.priceImpact,
      })
    }
  })

  // Vehicle adjustments
  const sizeMultiplier = VEHICLE_SIZE_MULTIPLIERS[vehicleData.size as keyof typeof VEHICLE_SIZE_MULTIPLIERS] || 1
  const bodyTypeMultiplier = BODY_TYPE_MULTIPLIERS[vehicleData.bodyType as keyof typeof BODY_TYPE_MULTIPLIERS] || 1

  const vehicleAdjustments = []

  if (sizeMultiplier !== 1) {
    vehicleAdjustments.push({
      item: `Vehicle Size (${vehicleData.size})`,
      description: `Size-based pricing adjustment`,
      multiplier: sizeMultiplier,
      amount: basePrice * (sizeMultiplier - 1),
    })
  }

  if (bodyTypeMultiplier !== 1) {
    vehicleAdjustments.push({
      item: `Body Type (${vehicleData.bodyType})`,
      description: `Body type complexity adjustment`,
      multiplier: bodyTypeMultiplier,
      amount: basePrice * (bodyTypeMultiplier - 1),
    })
  }

  // Service adjustments (from estimate if available)
  const serviceAdjustments: any[] = []
  if (estimate?.adjustments) {
    Object.entries(estimate.adjustments).forEach(([key, multiplier]) => {
      if (key !== "vehicleSize" && key !== "bodyType" && key !== "damage" && key !== "cleanliness") {
        const amount = basePrice * ((multiplier as number) - 1)
        if (Math.abs(amount) > 1) {
          // Only include significant adjustments
          serviceAdjustments.push({
            item: key.replace(/([A-Z])/g, " $1").trim(),
            description: `Service-related adjustment`,
            multiplier: multiplier as number,
            amount,
          })
        }
      }
    })
  }

  return {
    basePrice,
    damageAdjustments,
    cleanlinessAdjustments,
    vehicleAdjustments,
    serviceAdjustments,
    subtotal: estimate?.subtotal || basePrice,
    taxes: estimate?.taxes || basePrice * 0.085,
    total: estimate?.total || basePrice * 1.085,
  }
}

function generateRecommendations(exteriorDamages: any[], interiorIssues: any[], aiResults: AIAnalysisResults) {
  const immediate: string[] = []
  const optional: string[] = []
  const preventive: string[] = []

  // Immediate recommendations based on severe issues
  exteriorDamages
    .filter((d) => d.severity === "severe")
    .forEach((damage) => {
      immediate.push(`Address ${damage.type} on ${damage.location} to prevent further deterioration`)
    })

  interiorIssues
    .filter((i) => i.severity === "severe")
    .forEach((issue) => {
      immediate.push(`Treat ${issue.type} in ${issue.location} immediately`)
    })

  // Optional recommendations
  if (exteriorDamages.some((d) => d.type === "scratch")) {
    optional.push("Consider paint correction service for optimal finish")
  }

  if (interiorIssues.some((i) => i.type === "stain")) {
    optional.push("Deep cleaning treatment recommended for stain removal")
  }

  // Preventive recommendations
  preventive.push("Regular washing every 2-3 weeks to maintain condition")
  preventive.push("Apply protective coating after detailing")
  preventive.push("Use interior protectants to prevent future wear")

  // Add AI-generated recommendations if available
  if (aiResults.exterior?.recommendations) {
    optional.push(...aiResults.exterior.recommendations)
  }

  if (aiResults.interior?.recommendations) {
    optional.push(...aiResults.interior.recommendations)
  }

  return { immediate, optional, preventive }
}

function calculateDetailedDuration(vehicleData: VehicleData, exteriorDamages: any[], interiorIssues: any[]) {
  const baseDuration = {
    preparation: 0.5,
    exterior: 2.0,
    interior: 1.5,
    finishing: 0.5,
  }

  // Adjust for vehicle size
  const sizeMultiplier = VEHICLE_SIZE_MULTIPLIERS[vehicleData.size as keyof typeof VEHICLE_SIZE_MULTIPLIERS] || 1

  // Adjust for damage complexity
  const damageTimeAdd = exteriorDamages.reduce((total, damage) => {
    const timeMap = { minor: 0.2, moderate: 0.5, severe: 1.0 }
    return total + (timeMap[damage.severity as keyof typeof timeMap] || 0)
  }, 0)

  // Adjust for interior issues
  const interiorTimeAdd = interiorIssues.reduce((total, issue) => {
    const timeMap = { minor: 0.1, moderate: 0.3, severe: 0.6 }
    return total + (timeMap[issue.severity as keyof typeof timeMap] || 0)
  }, 0)

  const adjusted = {
    preparation: baseDuration.preparation * sizeMultiplier,
    exterior: (baseDuration.exterior + damageTimeAdd) * sizeMultiplier,
    interior: (baseDuration.interior + interiorTimeAdd) * sizeMultiplier,
    finishing: baseDuration.finishing * sizeMultiplier,
  }

  return {
    ...adjusted,
    total: Object.values(adjusted).reduce((sum, time) => sum + time, 0),
  }
}

function generateRiskFactors(exteriorDamages: any[], interiorIssues: any[], vehicleData: VehicleData) {
  const risks: Array<{
    factor: string
    risk: "low" | "medium" | "high"
    description: string
    mitigation: string
  }> = []

  // Age-based risk
  const age = new Date().getFullYear() - vehicleData.year
  if (age > 15) {
    risks.push({
      factor: "Vehicle Age",
      risk: "medium",
      description: "Older vehicles may have hidden issues that become apparent during detailing",
      mitigation: "Thorough pre-inspection and careful handling",
    })
  }

  // Severe damage risk
  if (exteriorDamages.some((d) => d.severity === "severe")) {
    risks.push({
      factor: "Severe Damage",
      risk: "high",
      description: "Severe damage may require specialized treatment or reveal additional issues",
      mitigation: "Detailed assessment and customer communication before proceeding",
    })
  }

  // Interior contamination risk
  if (interiorIssues.some((i) => i.type === "odor" && i.severity === "severe")) {
    risks.push({
      factor: "Odor Contamination",
      risk: "medium",
      description: "Strong odors may require multiple treatments or specialized equipment",
      mitigation: "Ozone treatment and extended cleaning time",
    })
  }

  // Default low risk if no issues
  if (risks.length === 0) {
    risks.push({
      factor: "Standard Service",
      risk: "low",
      description: "Vehicle appears to be in good condition with minimal risk factors",
      mitigation: "Follow standard procedures and quality checks",
    })
  }

  return risks
}

function generatePaintConditionDescription(exteriorAnalysis: any): string {
  if (!exteriorAnalysis) return "Paint condition assessment not available"

  const damageCount = exteriorAnalysis.damages?.length || 0
  if (damageCount === 0) return "Paint is in excellent condition with no visible damage"
  if (damageCount <= 2) return "Paint shows minor imperfections but overall good condition"
  if (damageCount <= 5) return "Paint has moderate wear with several areas requiring attention"
  return "Paint shows significant wear and damage requiring comprehensive treatment"
}

function generateBodyIntegrityDescription(exteriorAnalysis: any): string {
  if (!exteriorAnalysis) return "Body integrity assessment not available"

  const hasDents = exteriorAnalysis.damages?.some((d: any) => d.type === "dent")
  const hasRust = exteriorAnalysis.damages?.some((d: any) => d.type === "rust")

  if (hasRust) return "Body shows signs of corrosion requiring immediate attention"
  if (hasDents) return "Body has impact damage but structural integrity appears sound"
  return "Body panels are in good condition with proper alignment"
}

function generateMaterialConditionDescription(interiorAnalysis: any): string {
  if (!interiorAnalysis) return "Material condition assessment not available"

  const hasWear = interiorAnalysis.issues?.some((i: any) => i.type === "wear")
  const hasTears = interiorAnalysis.issues?.some((i: any) => i.type === "tear")

  if (hasTears) return "Interior materials show significant wear with tears requiring repair"
  if (hasWear) return "Interior materials show normal wear patterns for vehicle age"
  return "Interior materials are in excellent condition"
}

function determineOdorLevel(interiorIssues: any[]): "none" | "mild" | "moderate" | "strong" {
  const odorIssues = interiorIssues.filter((i) => i.type === "odor")
  if (odorIssues.length === 0) return "none"
  if (odorIssues.some((i) => i.severity === "severe")) return "strong"
  if (odorIssues.some((i) => i.severity === "moderate")) return "moderate"
  return "mild"
}

function determineWearLevel(interiorIssues: any[]): "minimal" | "normal" | "heavy" | "excessive" {
  const wearIssues = interiorIssues.filter((i) => i.type === "wear")
  if (wearIssues.length === 0) return "minimal"
  if (wearIssues.some((i) => i.severity === "severe")) return "excessive"
  if (wearIssues.some((i) => i.severity === "moderate")) return "heavy"
  return "normal"
}

function estimateVehicleValue(vehicleData: VehicleData): number {
  // Simple vehicle value estimation based on age and type
  const currentYear = new Date().getFullYear()
  const age = currentYear - vehicleData.year

  const baseValues = {
    compact: 15000,
    midsize: 25000,
    large: 35000,
    xlarge: 45000,
    commercial: 40000,
  }

  const baseValue = baseValues[vehicleData.size as keyof typeof baseValues] || 25000
  const depreciationRate = 0.15 // 15% per year

  return Math.max(baseValue * Math.pow(1 - depreciationRate, age), baseValue * 0.1)
}
