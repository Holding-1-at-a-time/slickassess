"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AIAssessmentSummary } from "@/components/ai-assessment-summary"
import type { AIAssessmentData } from "@/components/ai-assessment-summary"
import { FileText, User, Car } from "lucide-react"

interface AssessmentReportProps {
  assessmentData: AIAssessmentData
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
  reportNumber?: string
  generatedDate?: Date
}

export function AssessmentReport({
  assessmentData,
  customerInfo,
  businessInfo,
  reportNumber,
  generatedDate = new Date(),
}: AssessmentReportProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  return (
    <div className="max-w-4xl mx-auto p-8 bg-white">
      {/* Report Header */}
      <div className="mb-8">
        <div className="flex justify-between items-start mb-6">
          <div>
            {businessInfo && (
              <div className="mb-4">
                <h1 className="text-2xl font-bold text-gray-900">{businessInfo.name}</h1>
                <p className="text-gray-600">{businessInfo.address}</p>
                <p className="text-gray-600">
                  {businessInfo.phone} • {businessInfo.email}
                </p>
              </div>
            )}
            <h2 className="text-xl font-semibold text-gray-800">Vehicle Assessment Report</h2>
          </div>
          <div className="text-right">
            {reportNumber && <p className="text-sm text-gray-600">Report #: {reportNumber}</p>}
            <p className="text-sm text-gray-600">Generated: {generatedDate.toLocaleDateString()}</p>
          </div>
        </div>

        {/* Customer and Vehicle Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {customerInfo && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p>
                    <strong>Name:</strong> {customerInfo.name}
                  </p>
                  <p>
                    <strong>Email:</strong> {customerInfo.email}
                  </p>
                  <p>
                    <strong>Phone:</strong> {customerInfo.phone}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Car className="h-4 w-4" />
                Vehicle Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <p>
                  <strong>Vehicle:</strong> {assessmentData.vehicleInfo.year} {assessmentData.vehicleInfo.make}{" "}
                  {assessmentData.vehicleInfo.model}
                </p>
                <p>
                  <strong>Body Type:</strong> {assessmentData.vehicleInfo.bodyType}
                </p>
                <p>
                  <strong>Size Category:</strong> {assessmentData.vehicleInfo.size}
                </p>
                {assessmentData.vehicleInfo.estimatedValue && (
                  <p>
                    <strong>Estimated Value:</strong> {formatCurrency(assessmentData.vehicleInfo.estimatedValue)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Executive Summary */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Executive Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 border rounded-lg">
                <div className="text-xl font-bold text-blue-600">
                  {assessmentData.exteriorAnalysis.totalDamageCount}
                </div>
                <div className="text-sm text-gray-600">Issues Found</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-xl font-bold text-green-600">
                  {formatCurrency(assessmentData.pricingBreakdown.total)}
                </div>
                <div className="text-sm text-gray-600">Total Estimate</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-xl font-bold text-purple-600">{assessmentData.estimatedDuration.total}h</div>
                <div className="text-sm text-gray-600">Est. Duration</div>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-xl font-bold text-orange-600">
                  {Math.round(
                    ((assessmentData.exteriorAnalysis.confidence + assessmentData.interiorAnalysis.confidence) / 2) *
                      100,
                  )}
                  %
                </div>
                <div className="text-sm text-gray-600">AI Confidence</div>
              </div>
            </div>

            <div className="prose max-w-none">
              <p className="text-gray-700">
                This comprehensive AI-powered assessment has identified{" "}
                {assessmentData.exteriorAnalysis.totalDamageCount} issues requiring attention. The vehicle's exterior
                condition is rated as <strong>{assessmentData.exteriorAnalysis.overallCondition}</strong>
                and interior cleanliness is <strong>{assessmentData.interiorAnalysis.overallCleanliness}</strong>. Based
                on our analysis, the estimated service cost is {formatCurrency(assessmentData.pricingBreakdown.total)}
                with an expected completion time of {assessmentData.estimatedDuration.total} hours.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed AI Assessment */}
      <AIAssessmentSummary
        assessmentData={assessmentData}
        onItemClick={(item) => {
          // In report mode, clicking items could scroll to detailed sections
          console.log("Report item clicked:", item)
        }}
      />

      {/* Terms and Conditions */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Terms and Conditions</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p>
            <strong>Estimate Validity:</strong> This estimate is valid for 30 days from the date of generation. Prices
            may vary based on actual conditions discovered during service.
          </p>
          <p>
            <strong>AI Assessment Disclaimer:</strong> This assessment is generated using artificial intelligence and
            should be considered as an initial evaluation. Final pricing may differ based on detailed in-person
            inspection.
          </p>
          <p>
            <strong>Service Guarantee:</strong> All services are performed to industry standards with satisfaction
            guarantee. Additional charges may apply for services beyond the scope of this estimate.
          </p>
          <p>
            <strong>Payment Terms:</strong> Payment is due upon completion of services unless other arrangements have
            been made in advance.
          </p>
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-8 pt-4 border-t text-center text-sm text-gray-500">
        <p>This report was generated automatically using AI-powered vehicle assessment technology.</p>
        <p>For questions about this assessment, please contact us using the information provided above.</p>
      </div>
    </div>
  )
}
