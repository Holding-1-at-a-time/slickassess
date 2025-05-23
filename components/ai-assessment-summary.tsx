"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  AlertTriangle,
  CheckCircle2,
  Eye,
  Clock,
  DollarSign,
  Camera,
  MapPin,
  Wrench,
  Sparkles,
  Info,
  TrendingUp,
  Car,
} from "lucide-react"

interface DamageItem {
  id: string
  type: string
  severity: "minor" | "moderate" | "severe"
  location: string
  size?: string
  repairComplexity?: string
  confidence: number
  priceImpact: number
  description: string
  boundingBox?: {
    x: number
    y: number
    width: number
    height: number
  }
}

interface InteriorIssue {
  id: string
  type: string
  severity: "minor" | "moderate" | "severe"
  location: string
  recommendation: string
  confidence: number
  priceImpact: number
  description: string
}

interface AIAssessmentData {
  vehicleInfo: {
    make: string
    model: string
    year: number
    bodyType: string
    size: string
    estimatedValue?: number
  }
  exteriorAnalysis: {
    overallCondition: "excellent" | "good" | "fair" | "poor"
    damages: DamageItem[]
    paintCondition: string
    bodyIntegrity: string
    confidence: number
    totalDamageCount: number
    severityDistribution: {
      minor: number
      moderate: number
      severe: number
    }
  }
  interiorAnalysis: {
    overallCleanliness: "immaculate" | "clean" | "average" | "dirty" | "filthy"
    issues: InteriorIssue[]
    materialCondition: string
    odorLevel: "none" | "mild" | "moderate" | "strong"
    wearLevel: "minimal" | "normal" | "heavy" | "excessive"
    confidence: number
  }
  pricingBreakdown: {
    basePrice: number
    damageAdjustments: Array<{
      item: string
      description: string
      multiplier: number
      amount: number
    }>
    cleanlinessAdjustments: Array<{
      item: string
      description: string
      multiplier: number
      amount: number
    }>
    vehicleAdjustments: Array<{
      item: string
      description: string
      multiplier: number
      amount: number
    }>
    serviceAdjustments: Array<{
      item: string
      description: string
      multiplier: number
      amount: number
    }>
    subtotal: number
    taxes: number
    total: number
  }
  recommendations: {
    immediate: string[]
    optional: string[]
    preventive: string[]
  }
  estimatedDuration: {
    preparation: number
    exterior: number
    interior: number
    finishing: number
    total: number
  }
  riskFactors: Array<{
    factor: string
    risk: "low" | "medium" | "high"
    description: string
    mitigation: string
  }>
}

interface AIAssessmentSummaryProps {
  assessmentData: AIAssessmentData
  imageUrls?: string[]
  onItemClick?: (item: DamageItem | InteriorIssue) => void
}

export function AIAssessmentSummary({ assessmentData, imageUrls, onItemClick }: AIAssessmentSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "minor":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "moderate":
        return "text-orange-600 bg-orange-50 border-orange-200"
      case "severe":
        return "text-red-600 bg-red-50 border-red-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  const getConditionColor = (condition: string) => {
    switch (condition.toLowerCase()) {
      case "excellent":
        return "text-green-600"
      case "good":
        return "text-blue-600"
      case "fair":
        return "text-yellow-600"
      case "poor":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  const getConfidenceLevel = (confidence: number) => {
    if (confidence >= 0.9) return { label: "High", color: "text-green-600" }
    if (confidence >= 0.7) return { label: "Medium", color: "text-yellow-600" }
    return { label: "Low", color: "text-red-600" }
  }

  const totalDamageImpact = assessmentData.exteriorAnalysis.damages.reduce((sum, damage) => sum + damage.priceImpact, 0)
  const totalInteriorImpact = assessmentData.interiorAnalysis.issues.reduce((sum, issue) => sum + issue.priceImpact, 0)

  return (
    <div className="space-y-6">
      {/* Header Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            AI Assessment Summary
          </CardTitle>
          <CardDescription>
            Comprehensive AI analysis with itemized pricing transparency for {assessmentData.vehicleInfo.year}{" "}
            {assessmentData.vehicleInfo.make} {assessmentData.vehicleInfo.model}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{assessmentData.exteriorAnalysis.totalDamageCount}</div>
              <div className="text-sm text-muted-foreground">Issues Detected</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div
                className={`text-2xl font-bold ${getConditionColor(assessmentData.exteriorAnalysis.overallCondition)}`}
              >
                {assessmentData.exteriorAnalysis.overallCondition.charAt(0).toUpperCase() +
                  assessmentData.exteriorAnalysis.overallCondition.slice(1)}
              </div>
              <div className="text-sm text-muted-foreground">Overall Condition</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-green-600">
                {Math.round(
                  ((assessmentData.exteriorAnalysis.confidence + assessmentData.interiorAnalysis.confidence) / 2) * 100,
                )}
                %
              </div>
              <div className="text-sm text-muted-foreground">AI Confidence</div>
            </div>
            <div className="text-center p-4 border rounded-lg">
              <div className="text-2xl font-bold text-purple-600">{assessmentData.estimatedDuration.total}h</div>
              <div className="text-sm text-muted-foreground">Est. Duration</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="exterior" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="exterior">Exterior Analysis</TabsTrigger>
          <TabsTrigger value="interior">Interior Analysis</TabsTrigger>
          <TabsTrigger value="pricing">Pricing Breakdown</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        {/* Exterior Analysis Tab */}
        <TabsContent value="exterior" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Exterior Condition Analysis
              </CardTitle>
              <div className="flex items-center gap-4">
                <Badge
                  variant="outline"
                  className={getConditionColor(assessmentData.exteriorAnalysis.overallCondition)}
                >
                  {assessmentData.exteriorAnalysis.overallCondition.toUpperCase()}
                </Badge>
                <Badge
                  variant="outline"
                  className={getConfidenceLevel(assessmentData.exteriorAnalysis.confidence).color}
                >
                  {getConfidenceLevel(assessmentData.exteriorAnalysis.confidence).label} Confidence (
                  {Math.round(assessmentData.exteriorAnalysis.confidence * 100)}%)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Severity Distribution */}
              <div>
                <h4 className="font-medium mb-3">Damage Severity Distribution</h4>
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center p-3 border rounded-lg bg-yellow-50">
                    <div className="text-xl font-bold text-yellow-600">
                      {assessmentData.exteriorAnalysis.severityDistribution.minor}
                    </div>
                    <div className="text-sm text-yellow-700">Minor Issues</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg bg-orange-50">
                    <div className="text-xl font-bold text-orange-600">
                      {assessmentData.exteriorAnalysis.severityDistribution.moderate}
                    </div>
                    <div className="text-sm text-orange-700">Moderate Issues</div>
                  </div>
                  <div className="text-center p-3 border rounded-lg bg-red-50">
                    <div className="text-xl font-bold text-red-600">
                      {assessmentData.exteriorAnalysis.severityDistribution.severe}
                    </div>
                    <div className="text-sm text-red-700">Severe Issues</div>
                  </div>
                </div>
              </div>

              {/* Detailed Damage List */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Detected Issues</h4>
                  <Badge variant="outline">Total Price Impact: {formatCurrency(totalDamageImpact)}</Badge>
                </div>

                {assessmentData.exteriorAnalysis.damages.length > 0 ? (
                  <div className="space-y-3">
                    {assessmentData.exteriorAnalysis.damages.map((damage, index) => (
                      <Card
                        key={damage.id}
                        className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${getSeverityColor(damage.severity).split(" ")[2]}`}
                        onClick={() => onItemClick?.(damage)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className={getSeverityColor(damage.severity)}>
                                  {damage.severity.toUpperCase()}
                                </Badge>
                                <Badge variant="secondary">{damage.type}</Badge>
                                <span className="text-sm text-muted-foreground">#{index + 1}</span>
                              </div>
                              <h5 className="font-medium">{damage.description}</h5>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {damage.location}
                                </div>
                                {damage.size && (
                                  <div className="flex items-center gap-1">
                                    <Info className="h-3 w-3" />
                                    {damage.size}
                                  </div>
                                )}
                                {damage.repairComplexity && (
                                  <div className="flex items-center gap-1">
                                    <Wrench className="h-3 w-3" />
                                    {damage.repairComplexity}
                                  </div>
                                )}
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  {Math.round(damage.confidence * 100)}% confidence
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-red-600">
                                +{formatCurrency(damage.priceImpact)}
                              </div>
                              <div className="text-xs text-muted-foreground">Price Impact</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-lg bg-green-50">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
                    <p className="text-green-800 font-medium">No exterior damage detected</p>
                    <p className="text-green-600 text-sm">Vehicle exterior is in excellent condition</p>
                  </div>
                )}
              </div>

              {/* Paint and Body Condition */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 border rounded-lg">
                  <h5 className="font-medium mb-2">Paint Condition</h5>
                  <p className="text-sm text-muted-foreground">{assessmentData.exteriorAnalysis.paintCondition}</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <h5 className="font-medium mb-2">Body Integrity</h5>
                  <p className="text-sm text-muted-foreground">{assessmentData.exteriorAnalysis.bodyIntegrity}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Interior Analysis Tab */}
        <TabsContent value="interior" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                Interior Condition Analysis
              </CardTitle>
              <div className="flex items-center gap-4">
                <Badge
                  variant="outline"
                  className={getConditionColor(assessmentData.interiorAnalysis.overallCleanliness)}
                >
                  {assessmentData.interiorAnalysis.overallCleanliness.toUpperCase()}
                </Badge>
                <Badge
                  variant="outline"
                  className={getConfidenceLevel(assessmentData.interiorAnalysis.confidence).color}
                >
                  {getConfidenceLevel(assessmentData.interiorAnalysis.confidence).label} Confidence (
                  {Math.round(assessmentData.interiorAnalysis.confidence * 100)}%)
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Interior Condition Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-lg font-bold capitalize">
                    {assessmentData.interiorAnalysis.overallCleanliness}
                  </div>
                  <div className="text-sm text-muted-foreground">Cleanliness Level</div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-lg font-bold capitalize">{assessmentData.interiorAnalysis.wearLevel}</div>
                  <div className="text-sm text-muted-foreground">Wear Level</div>
                </div>
                <div className="p-4 border rounded-lg text-center">
                  <div className="text-lg font-bold capitalize">{assessmentData.interiorAnalysis.odorLevel}</div>
                  <div className="text-sm text-muted-foreground">Odor Level</div>
                </div>
              </div>

              {/* Interior Issues */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-medium">Interior Issues</h4>
                  <Badge variant="outline">Total Price Impact: {formatCurrency(totalInteriorImpact)}</Badge>
                </div>

                {assessmentData.interiorAnalysis.issues.length > 0 ? (
                  <div className="space-y-3">
                    {assessmentData.interiorAnalysis.issues.map((issue, index) => (
                      <Card
                        key={issue.id}
                        className={`cursor-pointer hover:shadow-md transition-shadow border-l-4 ${getSeverityColor(issue.severity).split(" ")[2]}`}
                        onClick={() => onItemClick?.(issue)}
                      >
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant="outline" className={getSeverityColor(issue.severity)}>
                                  {issue.severity.toUpperCase()}
                                </Badge>
                                <Badge variant="secondary">{issue.type}</Badge>
                                <span className="text-sm text-muted-foreground">#{index + 1}</span>
                              </div>
                              <h5 className="font-medium">{issue.description}</h5>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mt-2 text-sm text-muted-foreground">
                                <div className="flex items-center gap-1">
                                  <MapPin className="h-3 w-3" />
                                  {issue.location}
                                </div>
                                <div className="flex items-center gap-1">
                                  <TrendingUp className="h-3 w-3" />
                                  {Math.round(issue.confidence * 100)}% confidence
                                </div>
                                <div className="flex items-center gap-1">
                                  <Wrench className="h-3 w-3" />
                                  {issue.recommendation}
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-lg font-bold text-red-600">+{formatCurrency(issue.priceImpact)}</div>
                              <div className="text-xs text-muted-foreground">Price Impact</div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 border rounded-lg bg-green-50">
                    <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
                    <p className="text-green-800 font-medium">No interior issues detected</p>
                    <p className="text-green-600 text-sm">Interior is in excellent condition</p>
                  </div>
                )}
              </div>

              {/* Material Condition */}
              <div className="p-4 border rounded-lg">
                <h5 className="font-medium mb-2">Material Condition Assessment</h5>
                <p className="text-sm text-muted-foreground">{assessmentData.interiorAnalysis.materialCondition}</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Pricing Breakdown Tab */}
        <TabsContent value="pricing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Itemized Pricing Breakdown
              </CardTitle>
              <CardDescription>Transparent pricing based on AI assessment findings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Base Price */}
              <div className="flex justify-between items-center p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div>
                  <h4 className="font-medium">Base Service Price</h4>
                  <p className="text-sm text-muted-foreground">
                    Standard {assessmentData.vehicleInfo.size} {assessmentData.vehicleInfo.bodyType} detailing
                  </p>
                </div>
                <div className="text-xl font-bold text-blue-600">
                  {formatCurrency(assessmentData.pricingBreakdown.basePrice)}
                </div>
              </div>

              {/* Damage Adjustments */}
              {assessmentData.pricingBreakdown.damageAdjustments.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    Damage-Related Adjustments
                  </h4>
                  <div className="space-y-2">
                    {assessmentData.pricingBreakdown.damageAdjustments.map((adjustment, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{adjustment.item}</p>
                          <p className="text-sm text-muted-foreground">{adjustment.description}</p>
                        </div>
                        <div className="text-right">
                          <div className="text-red-600 font-medium">+{formatCurrency(adjustment.amount)}</div>
                          <div className="text-xs text-muted-foreground">
                            {((adjustment.multiplier - 1) * 100).toFixed(1)}% increase
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Cleanliness Adjustments */}
              {assessmentData.pricingBreakdown.cleanlinessAdjustments.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-orange-600" />
                    Cleanliness-Related Adjustments
                  </h4>
                  <div className="space-y-2">
                    {assessmentData.pricingBreakdown.cleanlinessAdjustments.map((adjustment, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{adjustment.item}</p>
                          <p className="text-sm text-muted-foreground">{adjustment.description}</p>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${adjustment.amount >= 0 ? "text-red-600" : "text-green-600"}`}>
                            {adjustment.amount >= 0 ? "+" : ""}
                            {formatCurrency(adjustment.amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {((adjustment.multiplier - 1) * 100).toFixed(1)}%{" "}
                            {adjustment.multiplier >= 1 ? "increase" : "discount"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vehicle Adjustments */}
              {assessmentData.pricingBreakdown.vehicleAdjustments.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Car className="h-4 w-4 text-blue-600" />
                    Vehicle-Specific Adjustments
                  </h4>
                  <div className="space-y-2">
                    {assessmentData.pricingBreakdown.vehicleAdjustments.map((adjustment, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{adjustment.item}</p>
                          <p className="text-sm text-muted-foreground">{adjustment.description}</p>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${adjustment.amount >= 0 ? "text-red-600" : "text-green-600"}`}>
                            {adjustment.amount >= 0 ? "+" : ""}
                            {formatCurrency(adjustment.amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {((adjustment.multiplier - 1) * 100).toFixed(1)}%{" "}
                            {adjustment.multiplier >= 1 ? "increase" : "discount"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Service Adjustments */}
              {assessmentData.pricingBreakdown.serviceAdjustments.length > 0 && (
                <div>
                  <h4 className="font-medium mb-3 flex items-center gap-2">
                    <Wrench className="h-4 w-4 text-purple-600" />
                    Service-Related Adjustments
                  </h4>
                  <div className="space-y-2">
                    {assessmentData.pricingBreakdown.serviceAdjustments.map((adjustment, index) => (
                      <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">{adjustment.item}</p>
                          <p className="text-sm text-muted-foreground">{adjustment.description}</p>
                        </div>
                        <div className="text-right">
                          <div className={`font-medium ${adjustment.amount >= 0 ? "text-red-600" : "text-green-600"}`}>
                            {adjustment.amount >= 0 ? "+" : ""}
                            {formatCurrency(adjustment.amount)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {((adjustment.multiplier - 1) * 100).toFixed(1)}%{" "}
                            {adjustment.multiplier >= 1 ? "increase" : "discount"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Separator />

              {/* Total Calculation */}
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Subtotal</span>
                  <span className="font-medium">{formatCurrency(assessmentData.pricingBreakdown.subtotal)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Taxes (8.5%)</span>
                  <span>{formatCurrency(assessmentData.pricingBreakdown.taxes)}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center text-xl font-bold">
                  <span>Total Estimate</span>
                  <span className="text-green-600">{formatCurrency(assessmentData.pricingBreakdown.total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Recommendations Tab */}
        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Time Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Estimated Time Breakdown
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span>Preparation</span>
                    <span>{assessmentData.estimatedDuration.preparation}h</span>
                  </div>
                  <Progress
                    value={
                      (assessmentData.estimatedDuration.preparation / assessmentData.estimatedDuration.total) * 100
                    }
                    className="h-2"
                  />

                  <div className="flex justify-between items-center">
                    <span>Exterior Work</span>
                    <span>{assessmentData.estimatedDuration.exterior}h</span>
                  </div>
                  <Progress
                    value={(assessmentData.estimatedDuration.exterior / assessmentData.estimatedDuration.total) * 100}
                    className="h-2"
                  />

                  <div className="flex justify-between items-center">
                    <span>Interior Work</span>
                    <span>{assessmentData.estimatedDuration.interior}h</span>
                  </div>
                  <Progress
                    value={(assessmentData.estimatedDuration.interior / assessmentData.estimatedDuration.total) * 100}
                    className="h-2"
                  />

                  <div className="flex justify-between items-center">
                    <span>Finishing</span>
                    <span>{assessmentData.estimatedDuration.finishing}h</span>
                  </div>
                  <Progress
                    value={(assessmentData.estimatedDuration.finishing / assessmentData.estimatedDuration.total) * 100}
                    className="h-2"
                  />

                  <Separator />
                  <div className="flex justify-between items-center font-bold">
                    <span>Total Time</span>
                    <span>{assessmentData.estimatedDuration.total}h</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Factors */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Risk Assessment
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {assessmentData.riskFactors.map((risk, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{risk.factor}</span>
                        <Badge
                          variant={
                            risk.risk === "high" ? "destructive" : risk.risk === "medium" ? "default" : "secondary"
                          }
                        >
                          {risk.risk.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{risk.description}</p>
                      <p className="text-sm font-medium">Mitigation: {risk.mitigation}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Service Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Service Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="immediate" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="immediate">Immediate</TabsTrigger>
                  <TabsTrigger value="optional">Optional</TabsTrigger>
                  <TabsTrigger value="preventive">Preventive</TabsTrigger>
                </TabsList>

                <TabsContent value="immediate" className="mt-4">
                  <div className="space-y-2">
                    {assessmentData.recommendations.immediate.map((rec, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 border rounded-lg bg-red-50">
                        <AlertTriangle className="h-4 w-4 text-red-600 mt-0.5" />
                        <span className="text-sm">{rec}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="optional" className="mt-4">
                  <div className="space-y-2">
                    {assessmentData.recommendations.optional.map((rec, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 border rounded-lg bg-blue-50">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                        <span className="text-sm">{rec}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                <TabsContent value="preventive" className="mt-4">
                  <div className="space-y-2">
                    {assessmentData.recommendations.preventive.map((rec, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 border rounded-lg bg-green-50">
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                        <span className="text-sm">{rec}</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
