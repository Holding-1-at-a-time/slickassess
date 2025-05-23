import { generateAIAssessmentSummary } from "@/lib/pricing/assessment-generator"
import type { AIAssessmentData } from "@/components/ai-assessment-summary"

interface GenerateReportParams {
  vehicleData: {
    make: string
    model: string
    year: number
    bodyType?: string
    size?: string
  }
  aiAnalysisResults: {
    exterior?: any
    interior?: any
  }
  pricingEstimate: any
  customerInfo?: {
    name: string
    email: string
    phone: string
  }
  businessInfo?: {
    name: string
    address: string
    phone: string
    email: string
  }
}

export function generateAssessmentReport(params: GenerateReportParams): {
  assessmentData: AIAssessmentData
  reportNumber: string
  generatedDate: Date
} {
  // Generate unique report number
  const reportNumber = `AR-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`

  // Generate AI assessment summary
  const assessmentData = generateAIAssessmentSummary(params.aiAnalysisResults, params.vehicleData, {
    basePrice: params.pricingEstimate.basePrice,
    estimate: params.pricingEstimate,
  })

  return {
    assessmentData,
    reportNumber,
    generatedDate: new Date(),
  }
}

export function formatReportForPrint(assessmentData: AIAssessmentData): string {
  // Generate a formatted text version for email or print
  const lines: string[] = []

  lines.push("VEHICLE ASSESSMENT REPORT")
  lines.push("=" + "=".repeat(50))
  lines.push("")

  // Vehicle Info
  lines.push("VEHICLE INFORMATION:")
  lines.push(
    `Vehicle: ${assessmentData.vehicleInfo.year} ${assessmentData.vehicleInfo.make} ${assessmentData.vehicleInfo.model}`,
  )
  lines.push(`Body Type: ${assessmentData.vehicleInfo.bodyType}`)
  lines.push(`Size: ${assessmentData.vehicleInfo.size}`)
  lines.push("")

  // Summary
  lines.push("ASSESSMENT SUMMARY:")
  lines.push(`Overall Exterior Condition: ${assessmentData.exteriorAnalysis.overallCondition.toUpperCase()}`)
  lines.push(`Overall Interior Cleanliness: ${assessmentData.interiorAnalysis.overallCleanliness.toUpperCase()}`)
  lines.push(`Total Issues Found: ${assessmentData.exteriorAnalysis.totalDamageCount}`)
  lines.push(`Estimated Duration: ${assessmentData.estimatedDuration.total} hours`)
  lines.push("")

  // Pricing
  lines.push("PRICING BREAKDOWN:")
  lines.push(`Base Price: $${assessmentData.pricingBreakdown.basePrice.toFixed(2)}`)
  lines.push(`Subtotal: $${assessmentData.pricingBreakdown.subtotal.toFixed(2)}`)
  lines.push(`Taxes: $${assessmentData.pricingBreakdown.taxes.toFixed(2)}`)
  lines.push(`TOTAL ESTIMATE: $${assessmentData.pricingBreakdown.total.toFixed(2)}`)
  lines.push("")

  // Exterior Issues
  if (assessmentData.exteriorAnalysis.damages.length > 0) {
    lines.push("EXTERIOR ISSUES:")
    assessmentData.exteriorAnalysis.damages.forEach((damage, index) => {
      lines.push(
        `${index + 1}. ${damage.description} - ${damage.severity.toUpperCase()} (+$${damage.priceImpact.toFixed(2)})`,
      )
    })
    lines.push("")
  }

  // Interior Issues
  if (assessmentData.interiorAnalysis.issues.length > 0) {
    lines.push("INTERIOR ISSUES:")
    assessmentData.interiorAnalysis.issues.forEach((issue, index) => {
      lines.push(
        `${index + 1}. ${issue.description} - ${issue.severity.toUpperCase()} (+$${issue.priceImpact.toFixed(2)})`,
      )
    })
    lines.push("")
  }

  // Recommendations
  if (assessmentData.recommendations.immediate.length > 0) {
    lines.push("IMMEDIATE RECOMMENDATIONS:")
    assessmentData.recommendations.immediate.forEach((rec, index) => {
      lines.push(`${index + 1}. ${rec}`)
    })
    lines.push("")
  }

  lines.push("This assessment was generated using AI-powered analysis.")
  lines.push(`Generated on: ${new Date().toLocaleDateString()}`)

  return lines.join("\n")
}
