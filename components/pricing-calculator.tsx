"use client"

import { useState } from "react"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { Calculator, Clock, DollarSign, AlertCircle, CheckCircle2 } from "lucide-react"
import type { Id } from "@/convex/_generated/dataModel"

interface PricingCalculatorProps {
  tenantId: Id<"tenants">
  vehicleId: Id<"vehicles">
  assessmentId?: Id<"assessments">
  clientId?: Id<"clients">
  onEstimateGenerated?: (estimate: any) => void
}

const AVAILABLE_SERVICES = [
  { id: "exteriorWash", name: "Exterior Wash", description: "Basic exterior cleaning" },
  { id: "interiorCleaning", name: "Interior Cleaning", description: "Vacuum and interior detailing" },
  { id: "waxing", name: "Waxing", description: "Protective wax application" },
  { id: "detailing", name: "Full Detailing", description: "Complete interior and exterior detailing" },
  { id: "paintCorrection", name: "Paint Correction", description: "Remove scratches and swirl marks" },
  { id: "ceramicCoating", name: "Ceramic Coating", description: "Long-lasting paint protection" },
  { id: "engineCleaning", name: "Engine Cleaning", description: "Engine bay cleaning and detailing" },
  { id: "headlightRestoration", name: "Headlight Restoration", description: "Restore cloudy headlights" },
  { id: "scratchRepair", name: "Scratch Repair", description: "Fix minor to moderate scratches" },
  { id: "dentRepair", name: "Dent Repair", description: "Paintless dent removal" },
]

const VEHICLE_SIZES = [
  { value: "compact", label: "Compact Car" },
  { value: "midsize", label: "Midsize Car" },
  { value: "fullsize", label: "Full-size Car" },
  { value: "suv", label: "SUV" },
  { value: "truck", label: "Truck" },
  { value: "van", label: "Van" },
  { value: "luxury", label: "Luxury Vehicle" },
  { value: "exotic", label: "Exotic/Sports Car" },
]

const FILTHINESS_LEVELS = [
  { value: "clean", label: "Clean", description: "Recently washed, minimal dirt" },
  { value: "light", label: "Light", description: "Some dust and light dirt" },
  { value: "moderate", label: "Moderate", description: "Noticeable dirt and grime" },
  { value: "heavy", label: "Heavy", description: "Very dirty, significant buildup" },
  { value: "extreme", label: "Extreme", description: "Extremely dirty, requires extensive cleaning" },
]

const DURATION_OPTIONS = [
  { value: "quick", label: "Quick (1-2 hours)", description: "Basic services only" },
  { value: "standard", label: "Standard (2-4 hours)", description: "Most common services" },
  { value: "detailed", label: "Detailed (4-6 hours)", description: "Comprehensive services" },
  { value: "comprehensive", label: "Comprehensive (6+ hours)", description: "Full restoration work" },
]

export function PricingCalculator({
  tenantId,
  vehicleId,
  assessmentId,
  clientId,
  onEstimateGenerated,
}: PricingCalculatorProps) {
  const { toast } = useToast()

  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [vehicleSize, setVehicleSize] = useState<string>("")
  const [filthiness, setFilthiness] = useState<string>("")
  const [estimatedDuration, setEstimatedDuration] = useState<string>("")
  const [isRushOrder, setIsRushOrder] = useState(false)
  const [isCalculating, setIsCalculating] = useState(false)
  const [estimate, setEstimate] = useState<any>(null)

  const calculatePricing = useMutation(api.pricing.calculateServicePricing)
  const approvePricingEstimate = useMutation(api.pricing.approvePricingEstimate)
  const pricingConfig = useQuery(api.pricing.getPricingConfig, { tenantId })

  const handleServiceToggle = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId) ? prev.filter((id) => id !== serviceId) : [...prev, serviceId],
    )
  }

  const handleCalculate = async () => {
    if (selectedServices.length === 0) {
      toast({
        title: "No Services Selected",
        description: "Please select at least one service to calculate pricing.",
        variant: "destructive",
      })
      return
    }

    if (!vehicleSize || !filthiness || !estimatedDuration) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive",
      })
      return
    }

    setIsCalculating(true)

    try {
      const result = await calculatePricing({
        tenantId,
        vehicleId,
        assessmentId,
        clientId,
        requestedServices: selectedServices,
        vehicleSize,
        estimatedDuration,
        filthiness,
        isRushOrder,
      })

      setEstimate(result)

      if (onEstimateGenerated) {
        onEstimateGenerated(result)
      }

      toast({
        title: "Estimate Generated",
        description: `Total estimate: $${result.pricing.finalTotal.toFixed(2)}`,
      })
    } catch (error: any) {
      toast({
        title: "Calculation Failed",
        description: error.message || "Failed to calculate pricing",
        variant: "destructive",
      })
    } finally {
      setIsCalculating(false)
    }
  }

  const handleApproveEstimate = async () => {
    if (!estimate?.estimateId) return

    try {
      await approvePricingEstimate({ estimateId: estimate.estimateId })

      setEstimate((prev) => ({
        ...prev,
        status: "approved",
      }))

      toast({
        title: "Estimate Approved",
        description: "The pricing estimate has been approved and can now be converted to a service order.",
      })
    } catch (error: any) {
      toast({
        title: "Approval Failed",
        description: error.message || "Failed to approve estimate",
        variant: "destructive",
      })
    }
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "minor":
        return "bg-yellow-100 text-yellow-800"
      case "moderate":
        return "bg-orange-100 text-orange-800"
      case "severe":
        return "bg-red-100 text-red-800"
      case "extensive":
        return "bg-red-200 text-red-900"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  if (!pricingConfig) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-32">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Pricing configuration not found</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Service Pricing Calculator
          </CardTitle>
          <CardDescription>
            Select services and vehicle characteristics to generate a dynamic pricing estimate
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Service Selection */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Select Services</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {AVAILABLE_SERVICES.map((service) => (
                <div key={service.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={service.id}
                    checked={selectedServices.includes(service.id)}
                    onCheckedChange={() => handleServiceToggle(service.id)}
                  />
                  <div className="grid gap-1.5 leading-none">
                    <Label
                      htmlFor={service.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {service.name}
                    </Label>
                    <p className="text-xs text-muted-foreground">{service.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Vehicle Characteristics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="vehicleSize">Vehicle Size</Label>
              <Select value={vehicleSize} onValueChange={setVehicleSize}>
                <SelectTrigger>
                  <SelectValue placeholder="Select size" />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_SIZES.map((size) => (
                    <SelectItem key={size.value} value={size.value}>
                      {size.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="filthiness">Filthiness Level</Label>
              <Select value={filthiness} onValueChange={setFilthiness}>
                <SelectTrigger>
                  <SelectValue placeholder="Select level" />
                </SelectTrigger>
                <SelectContent>
                  {FILTHINESS_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      <div>
                        <div>{level.label}</div>
                        <div className="text-xs text-muted-foreground">{level.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="duration">Estimated Duration</Label>
              <Select value={estimatedDuration} onValueChange={setEstimatedDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  {DURATION_OPTIONS.map((duration) => (
                    <SelectItem key={duration.value} value={duration.value}>
                      <div>
                        <div>{duration.label}</div>
                        <div className="text-xs text-muted-foreground">{duration.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Rush Order</Label>
              <div className="flex items-center space-x-2 h-10">
                <Checkbox id="rushOrder" checked={isRushOrder} onCheckedChange={setIsRushOrder} />
                <Label htmlFor="rushOrder" className="text-sm">
                  Rush order (+{((pricingConfig.rushOrderMultiplier - 1) * 100).toFixed(0)}%)
                </Label>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleCalculate}
              disabled={isCalculating || selectedServices.length === 0}
              className="min-w-32"
            >
              {isCalculating ? (
                <>
                  <Calculator className="mr-2 h-4 w-4 animate-pulse" />
                  Calculating...
                </>
              ) : (
                <>
                  <Calculator className="mr-2 h-4 w-4" />
                  Calculate Pricing
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Estimate Results */}
      {estimate && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Pricing Estimate
              </div>
              <Badge variant={estimate.status === "approved" ? "default" : "secondary"}>{estimate.status}</Badge>
            </CardTitle>
            <CardDescription>Dynamic pricing based on vehicle characteristics and selected services</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Pricing Factors */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Vehicle Size</div>
                <div className="font-medium capitalize">{estimate.factors.vehicleSize}</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Damage Level</div>
                <div
                  className={`font-medium capitalize px-2 py-1 rounded text-xs ${getSeverityColor(estimate.factors.damageSeverity)}`}
                >
                  {estimate.factors.damageSeverity}
                </div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Filthiness</div>
                <div className="font-medium capitalize">{estimate.factors.filthiness}</div>
              </div>
              <div className="text-center p-3 bg-muted rounded-lg">
                <div className="text-sm text-muted-foreground">Duration</div>
                <div className="font-medium capitalize">{estimate.factors.estimatedDuration}</div>
              </div>
            </div>

            {/* Service Breakdown */}
            <div className="space-y-3">
              <h4 className="font-medium">Service Breakdown</h4>
              <div className="space-y-2">
                {estimate.serviceBreakdown.map((service: any, index: number) => (
                  <div key={index} className="flex justify-between items-center p-3 border rounded-lg">
                    <div>
                      <div className="font-medium capitalize">{service.service.replace(/([A-Z])/g, " $1").trim()}</div>
                      <div className="text-sm text-muted-foreground">
                        Base: ${service.basePrice.toFixed(2)} × {service.multipliers.total.toFixed(2)} multiplier
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">${service.adjustedPrice.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Pricing Summary */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <span>Subtotal</span>
                <span>${estimate.pricing.baseTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between">
                <span>Markup ({pricingConfig.markupPercentage}%)</span>
                <span>${(estimate.pricing.subtotal - estimate.pricing.baseTotal).toFixed(2)}</span>
              </div>

              {isRushOrder && (
                <div className="flex justify-between text-orange-600">
                  <span>Rush Order ({((pricingConfig.rushOrderMultiplier - 1) * 100).toFixed(0)}%)</span>
                  <span>+${(estimate.pricing.subtotal * (pricingConfig.rushOrderMultiplier - 1)).toFixed(2)}</span>
                </div>
              )}

              {estimate.pricing.discountAmount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>{estimate.pricing.discountType} Discount</span>
                  <span>-${estimate.pricing.discountAmount.toFixed(2)}</span>
                </div>
              )}

              <Separator />

              <div className="flex justify-between text-lg font-bold">
                <span>Total</span>
                <span>${estimate.pricing.finalTotal.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4" />
                  <span>Estimated Time: {estimate.pricing.estimatedHours} hours</span>
                </div>
                <span>Labor Cost: ${estimate.pricing.laborCost.toFixed(2)}</span>
              </div>
            </div>

            {estimate.status !== "approved" && (
              <div className="flex justify-end pt-4">
                <Button onClick={handleApproveEstimate} className="min-w-32">
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Approve Estimate
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
