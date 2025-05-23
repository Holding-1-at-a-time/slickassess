"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Calculator, Car, Clock, DollarSign, AlertTriangle, TrendingUp, Info } from "lucide-react"
import { Progress } from "@/components/ui/progress"
import { AIAssessmentSummary } from "@/components/ai-assessment-summary"
import { generateAIAssessmentSummary } from "@/lib/pricing/assessment-generator"

interface PricingEstimatorProps {
  vehicleId: Id<"vehicles">
  assessmentId?: Id<"assessments">
  onEstimateGenerated?: (estimate: any) => void
}

export function PricingEstimator({ vehicleId, assessmentId, onEstimateGenerated }: PricingEstimatorProps) {
  const [activeTab, setActiveTab] = useState("configure")
  const [isCalculating, setIsCalculating] = useState(false)
  const [currentEstimate, setCurrentEstimate] = useState<any>(null)
  const [assessmentSummary, setAssessmentSummary] = useState<any>(null)

  // Service configuration state
  const [serviceConfig, setServiceConfig] = useState({
    duration: "standard",
    includeInterior: true,
    includeExterior: true,
    includeEngine: false,
    includeWheels: true,
    additionalServices: [] as string[],
    urgency: "standard",
  })

  // Damage assessment override state
  const [damageOverride, setDamageOverride] = useState({
    enabled: false,
    exteriorSeverity: "minor",
    interiorCleanliness: "average",
    hasStains: false,
    hasOdors: false,
    hasPetHair: false,
  })

  const { toast } = useToast()

  // Queries and mutations
  const vehicle = useQuery(api.vehicles.getById, { id: vehicleId })
  const tenantPricing = useQuery(api.pricing.getTenantPricing, {})
  const calculateEstimate = useMutation(api.pricing.calculatePricingEstimate)
  const estimates = useQuery(api.pricing.getPricingEstimates, { vehicleId, limit: 5 })

  const handleCalculateEstimate = async () => {
    setIsCalculating(true)

    try {
      const result = await calculateEstimate({
        vehicleId,
        assessmentId,
        serviceOptions: serviceConfig,
        overrideDamageAssessment: damageOverride.enabled
          ? {
              exteriorDamage: {
                severity: damageOverride.exteriorSeverity,
                types: [],
                count: 0,
                requiresSpecialTreatment: false,
              },
              interiorCondition: {
                cleanliness: damageOverride.interiorCleanliness,
                materialType: "fabric",
                hasStains: damageOverride.hasStains,
                hasOdors: damageOverride.hasOdors,
                hasPetHair: damageOverride.hasPetHair,
              },
            }
          : undefined,
      })

      setCurrentEstimate(result.estimate)

      // Generate AI assessment summary
      if (vehicle) {
        const aiResults = {
          exterior: {
            overallCondition:
              result.estimate.adjustments.damage > 1.3
                ? "poor"
                : result.estimate.adjustments.damage > 1.1
                  ? "fair"
                  : "good",
            damages: [], // This would come from actual AI analysis
            summary: "AI analysis completed",
          },
          interior: {
            overallCleanliness:
              result.estimate.adjustments.cleanliness > 1.3
                ? "dirty"
                : result.estimate.adjustments.cleanliness > 1.1
                  ? "average"
                  : "clean",
            issues: [], // This would come from actual AI analysis
            summary: "Interior analysis completed",
          },
        }

        const summary = generateAIAssessmentSummary(
          aiResults,
          {
            make: vehicle.make,
            model: vehicle.model,
            year: vehicle.year,
            bodyType: vehicle.bodyType || "sedan",
            size: vehicle.size || "midsize",
          },
          {
            basePrice: result.estimate.basePrice,
            estimate: result.estimate,
          },
        )

        setAssessmentSummary(summary)
      }

      setActiveTab("estimate")

      toast({
        title: "Estimate Generated",
        description: `Total estimate: $${result.estimate.total.toFixed(2)}`,
      })

      if (onEstimateGenerated) {
        onEstimateGenerated(result)
      }
    } catch (error: any) {
      toast({
        title: "Calculation Failed",
        description: error.message || "Failed to calculate estimate",
        variant: "destructive",
      })
    } finally {
      setIsCalculating(false)
    }
  }

  const handleServiceChange = (key: string, value: any) => {
    setServiceConfig((prev) => ({ ...prev, [key]: value }))
  }

  const handleAdditionalServiceToggle = (service: string) => {
    setServiceConfig((prev) => ({
      ...prev,
      additionalServices: prev.additionalServices.includes(service)
        ? prev.additionalServices.filter((s) => s !== service)
        : [...prev.additionalServices, service],
    }))
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.9) return "text-green-600"
    if (confidence >= 0.7) return "text-yellow-600"
    return "text-red-600"
  }

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.9) return "High Confidence"
    if (confidence >= 0.7) return "Medium Confidence"
    return "Low Confidence"
  }

  if (!vehicle) {
    return <div>Loading vehicle information...</div>
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="h-5 w-5" />
          Pricing Estimator
        </CardTitle>
        <CardDescription>
          Generate accurate pricing estimates based on vehicle condition and service requirements
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="configure">Configure</TabsTrigger>
            <TabsTrigger value="estimate">Estimate</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="configure" className="space-y-6 mt-6">
            {/* Vehicle Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium flex items-center gap-2">
                <Car className="h-5 w-5" />
                Vehicle Information
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted rounded-lg">
                <div>
                  <Label className="text-sm text-muted-foreground">Make & Model</Label>
                  <p className="font-medium">
                    {vehicle.make} {vehicle.model}
                  </p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Year</Label>
                  <p className="font-medium">{vehicle.year}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Body Type</Label>
                  <p className="font-medium capitalize">{vehicle.bodyType || "Sedan"}</p>
                </div>
                <div>
                  <Label className="text-sm text-muted-foreground">Size</Label>
                  <p className="font-medium capitalize">{vehicle.size || "Midsize"}</p>
                </div>
              </div>
            </div>

            {/* Service Configuration */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Service Configuration</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="duration">Service Duration</Label>
                  <Select
                    value={serviceConfig.duration}
                    onValueChange={(value) => handleServiceChange("duration", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="express">Express (1-2 hours)</SelectItem>
                      <SelectItem value="standard">Standard (3-4 hours)</SelectItem>
                      <SelectItem value="premium">Premium (5-6 hours)</SelectItem>
                      <SelectItem value="luxury">Luxury (7+ hours)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="urgency">Service Urgency</Label>
                  <Select
                    value={serviceConfig.urgency}
                    onValueChange={(value) => handleServiceChange("urgency", value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="standard">Standard</SelectItem>
                      <SelectItem value="rush">Rush (+30%)</SelectItem>
                      <SelectItem value="emergency">Emergency (+60%)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Service Inclusions */}
              <div className="space-y-3">
                <Label>Service Inclusions</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeExterior"
                      checked={serviceConfig.includeExterior}
                      onCheckedChange={(checked) => handleServiceChange("includeExterior", checked)}
                    />
                    <Label htmlFor="includeExterior">Exterior Detailing</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeInterior"
                      checked={serviceConfig.includeInterior}
                      onCheckedChange={(checked) => handleServiceChange("includeInterior", checked)}
                    />
                    <Label htmlFor="includeInterior">Interior Detailing</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeEngine"
                      checked={serviceConfig.includeEngine}
                      onCheckedChange={(checked) => handleServiceChange("includeEngine", checked)}
                    />
                    <Label htmlFor="includeEngine">Engine Bay Cleaning</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="includeWheels"
                      checked={serviceConfig.includeWheels}
                      onCheckedChange={(checked) => handleServiceChange("includeWheels", checked)}
                    />
                    <Label htmlFor="includeWheels">Wheel & Tire Detail</Label>
                  </div>
                </div>
              </div>

              {/* Additional Services */}
              <div className="space-y-3">
                <Label>Additional Services</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { id: "wax", label: "Wax Application (+20%)" },
                    { id: "ceramic_coating", label: "Ceramic Coating (+80%)" },
                    { id: "paint_correction", label: "Paint Correction (+100%)" },
                    { id: "headlight_restoration", label: "Headlight Restoration (+30%)" },
                    { id: "engine_detail", label: "Detailed Engine Clean (+40%)" },
                    { id: "pet_hair_removal", label: "Pet Hair Removal (+40%)" },
                  ].map((service) => (
                    <div key={service.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={service.id}
                        checked={serviceConfig.additionalServices.includes(service.id)}
                        onCheckedChange={() => handleAdditionalServiceToggle(service.id)}
                      />
                      <Label htmlFor={service.id} className="text-sm">
                        {service.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Damage Assessment Override */}
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="damageOverride"
                  checked={damageOverride.enabled}
                  onCheckedChange={(checked) => setDamageOverride((prev) => ({ ...prev, enabled: !!checked }))}
                />
                <Label htmlFor="damageOverride">Manual Damage Assessment Override</Label>
                <Badge variant="outline">Optional</Badge>
              </div>

              {damageOverride.enabled && (
                <div className="p-4 border rounded-lg space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Exterior Damage Severity</Label>
                      <Select
                        value={damageOverride.exteriorSeverity}
                        onValueChange={(value) => setDamageOverride((prev) => ({ ...prev, exteriorSeverity: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No Damage</SelectItem>
                          <SelectItem value="minor">Minor Damage (+10%)</SelectItem>
                          <SelectItem value="moderate">Moderate Damage (+30%)</SelectItem>
                          <SelectItem value="severe">Severe Damage (+60%)</SelectItem>
                          <SelectItem value="extensive">Extensive Damage (+100%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Interior Cleanliness</Label>
                      <Select
                        value={damageOverride.interiorCleanliness}
                        onValueChange={(value) =>
                          setDamageOverride((prev) => ({ ...prev, interiorCleanliness: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="immaculate">Immaculate (-20%)</SelectItem>
                          <SelectItem value="clean">Clean (-10%)</SelectItem>
                          <SelectItem value="average">Average</SelectItem>
                          <SelectItem value="dirty">Dirty (+30%)</SelectItem>
                          <SelectItem value="filthy">Filthy (+60%)</SelectItem>
                          <SelectItem value="biohazard">Biohazard (+120%)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasStains"
                        checked={damageOverride.hasStains}
                        onCheckedChange={(checked) => setDamageOverride((prev) => ({ ...prev, hasStains: !!checked }))}
                      />
                      <Label htmlFor="hasStains">Has Stains (+30%)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasOdors"
                        checked={damageOverride.hasOdors}
                        onCheckedChange={(checked) => setDamageOverride((prev) => ({ ...prev, hasOdors: !!checked }))}
                      />
                      <Label htmlFor="hasOdors">Has Odors (+50%)</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Checkbox
                        id="hasPetHair"
                        checked={damageOverride.hasPetHair}
                        onCheckedChange={(checked) => setDamageOverride((prev) => ({ ...prev, hasPetHair: !!checked }))}
                      />
                      <Label htmlFor="hasPetHair">Pet Hair (+40%)</Label>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="estimate" className="space-y-6 mt-6">
            {currentEstimate && assessmentSummary ? (
              <div className="space-y-6">
                {/* AI Assessment Summary */}
                <AIAssessmentSummary
                  assessmentData={assessmentSummary}
                  onItemClick={(item) => {
                    console.log("Clicked item:", item)
                    // Handle item click - could open detailed view
                  }}
                />

                {/* Existing estimate content... */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                      <DollarSign className="h-6 w-6" />
                      {formatCurrency(currentEstimate.total)}
                    </h3>
                    <p className="text-muted-foreground">
                      Estimated Duration: {currentEstimate.estimatedDuration} hours
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={getConfidenceColor(currentEstimate.confidence)}>
                      {getConfidenceLabel(currentEstimate.confidence)} ({Math.round(currentEstimate.confidence * 100)}%)
                    </Badge>
                  </div>
                </div>

                {/* Rest of existing estimate content... */}
                {/* Price Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Price Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span>Base Price</span>
                      <span>{formatCurrency(currentEstimate.basePrice)}</span>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h4 className="font-medium">Adjustments</h4>
                      {Object.entries(currentEstimate.adjustments).map(([key, multiplier]) => {
                        const percentage = (((multiplier as number) - 1) * 100).toFixed(1)
                        const isIncrease = (multiplier as number) > 1
                        return (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                            <span className={isIncrease ? "text-red-600" : "text-green-600"}>
                              {isIncrease ? "+" : ""}
                              {percentage}%
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    <Separator />

                    <div className="flex justify-between font-medium">
                      <span>Subtotal</span>
                      <span>{formatCurrency(currentEstimate.subtotal)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Taxes (8.5%)</span>
                      <span>{formatCurrency(currentEstimate.taxes)}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(currentEstimate.total)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Cost Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cost Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(currentEstimate.breakdown).map(([category, amount]) => {
                        const percentage = (((amount as number) / currentEstimate.subtotal) * 100).toFixed(1)
                        return (
                          <div key={category} className="space-y-2">
                            <div className="flex justify-between">
                              <span className="capitalize">{category}</span>
                              <span>
                                {formatCurrency(amount as number)} ({percentage}%)
                              </span>
                            </div>
                            <Progress value={Number.parseFloat(percentage)} className="h-2" />
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Confidence Factors */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Estimate Confidence Factors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>Confidence Level:</strong> {getConfidenceLabel(currentEstimate.confidence)}
                      </p>
                      <p className="text-muted-foreground">
                        This estimate is based on vehicle specifications, damage assessment, and service requirements.
                        Actual pricing may vary based on specific conditions discovered during service.
                      </p>
                      {currentEstimate.confidence < 0.8 && (
                        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                          <div className="text-yellow-800">
                            <p className="font-medium">Lower Confidence Estimate</p>
                            <p className="text-sm">
                              Consider a detailed in-person assessment for more accurate pricing.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : currentEstimate ? (
              // Fallback to existing estimate display if no assessment summary
              <div className="space-y-6">
                {/* Existing estimate content without AI summary */}
                {/* Estimate Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-2xl font-bold flex items-center gap-2">
                      <DollarSign className="h-6 w-6" />
                      {formatCurrency(currentEstimate.total)}
                    </h3>
                    <p className="text-muted-foreground">
                      Estimated Duration: {currentEstimate.estimatedDuration} hours
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={getConfidenceColor(currentEstimate.confidence)}>
                      {getConfidenceLabel(currentEstimate.confidence)} ({Math.round(currentEstimate.confidence * 100)}%)
                    </Badge>
                  </div>
                </div>

                {/* Price Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Price Breakdown</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between">
                      <span>Base Price</span>
                      <span>{formatCurrency(currentEstimate.basePrice)}</span>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <h4 className="font-medium">Adjustments</h4>
                      {Object.entries(currentEstimate.adjustments).map(([key, multiplier]) => {
                        const percentage = (((multiplier as number) - 1) * 100).toFixed(1)
                        const isIncrease = (multiplier as number) > 1
                        return (
                          <div key={key} className="flex justify-between text-sm">
                            <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
                            <span className={isIncrease ? "text-red-600" : "text-green-600"}>
                              {isIncrease ? "+" : ""}
                              {percentage}%
                            </span>
                          </div>
                        )
                      })}
                    </div>

                    <Separator />

                    <div className="flex justify-between font-medium">
                      <span>Subtotal</span>
                      <span>{formatCurrency(currentEstimate.subtotal)}</span>
                    </div>

                    <div className="flex justify-between">
                      <span>Taxes (8.5%)</span>
                      <span>{formatCurrency(currentEstimate.taxes)}</span>
                    </div>

                    <Separator />

                    <div className="flex justify-between text-lg font-bold">
                      <span>Total</span>
                      <span>{formatCurrency(currentEstimate.total)}</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Cost Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Cost Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {Object.entries(currentEstimate.breakdown).map(([category, amount]) => {
                        const percentage = (((amount as number) / currentEstimate.subtotal) * 100).toFixed(1)
                        return (
                          <div key={category} className="space-y-2">
                            <div className="flex justify-between">
                              <span className="capitalize">{category}</span>
                              <span>
                                {formatCurrency(amount as number)} ({percentage}%)
                              </span>
                            </div>
                            <Progress value={Number.parseFloat(percentage)} className="h-2" />
                          </div>
                        )
                      })}
                    </div>
                  </CardContent>
                </Card>

                {/* Confidence Factors */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      Estimate Confidence Factors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm">
                      <p>
                        <strong>Confidence Level:</strong> {getConfidenceLabel(currentEstimate.confidence)}
                      </p>
                      <p className="text-muted-foreground">
                        This estimate is based on vehicle specifications, damage assessment, and service requirements.
                        Actual pricing may vary based on specific conditions discovered during service.
                      </p>
                      {currentEstimate.confidence < 0.8 && (
                        <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                          <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                          <div className="text-yellow-800">
                            <p className="font-medium">Lower Confidence Estimate</p>
                            <p className="text-sm">
                              Consider a detailed in-person assessment for more accurate pricing.
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            ) : (
              <div className="text-center py-12">
                <Calculator className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Estimate Generated</h3>
                <p className="text-muted-foreground mb-4">
                  Configure your service options and generate an estimate to see pricing details.
                </p>
                <Button onClick={() => setActiveTab("configure")}>Configure Services</Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4 mt-6">
            {estimates && estimates.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Previous Estimates</h3>
                {estimates.map((estimate) => (
                  <Card key={estimate._id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-medium">{formatCurrency(estimate.estimate.total)}</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(estimate.createdAt).toLocaleDateString()} •{estimate.estimate.estimatedDuration}h
                            •{estimate.serviceOptions.duration} service
                          </p>
                          <div className="flex gap-2 mt-2">
                            {estimate.serviceOptions.includeExterior && (
                              <Badge variant="secondary" className="text-xs">
                                Exterior
                              </Badge>
                            )}
                            {estimate.serviceOptions.includeInterior && (
                              <Badge variant="secondary" className="text-xs">
                                Interior
                              </Badge>
                            )}
                            {estimate.serviceOptions.includeEngine && (
                              <Badge variant="secondary" className="text-xs">
                                Engine
                              </Badge>
                            )}
                            {estimate.serviceOptions.urgency !== "standard" && (
                              <Badge variant="outline" className="text-xs capitalize">
                                {estimate.serviceOptions.urgency}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className={getConfidenceColor(estimate.estimate.confidence)}>
                            {Math.round(estimate.estimate.confidence * 100)}%
                          </Badge>
                          {estimate.status && (
                            <p className="text-xs text-muted-foreground mt-1 capitalize">{estimate.status}</p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-medium mb-2">No Previous Estimates</h3>
                <p className="text-muted-foreground">Generate your first estimate to see pricing history.</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          {tenantPricing && <span>Base rate: {formatCurrency(tenantPricing.basePricing.basePrice)}/service</span>}
        </div>
        <Button onClick={handleCalculateEstimate} disabled={isCalculating} className="min-w-[120px]">
          {isCalculating ? (
            <>
              <Clock className="mr-2 h-4 w-4 animate-spin" />
              Calculating...
            </>
          ) : (
            <>
              <Calculator className="mr-2 h-4 w-4" />
              Calculate Estimate
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
