"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { useToast } from "@/components/ui/use-toast"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Loader2, Save, DollarSign, TrendingUp } from "lucide-react"
import { Slider } from "@/components/ui/slider"

export default function PricingSettingsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const { toast } = useToast()

  // Get current pricing configuration
  const currentPricing = useQuery(api.pricing.getTenantPricing, {})
  const updatePricing = useMutation(api.pricing.updateTenantPricing)

  // Form state
  const [pricingConfig, setPricingConfig] = useState({
    basePrice: 150,
    pricePerHour: 75,
    minimumPrice: 50,
    maximumPrice: 1000,
    locationMultiplier: 1.0,
    seasonalMultiplier: 1.0,
    competitorAdjustment: 1.0,
    profitMargin: 0.25,
  })

  // Update form state when data loads
  useState(() => {
    if (currentPricing) {
      setPricingConfig({
        basePrice: currentPricing.basePricing.basePrice,
        pricePerHour: currentPricing.basePricing.pricePerHour,
        minimumPrice: currentPricing.basePricing.minimumPrice,
        maximumPrice: currentPricing.basePricing.maximumPrice,
        locationMultiplier: currentPricing.locationMultiplier,
        seasonalMultiplier: currentPricing.seasonalMultiplier,
        competitorAdjustment: currentPricing.competitorAdjustment,
        profitMargin: currentPricing.profitMargin,
      })
    }
  })

  const handleSave = async () => {
    setIsLoading(true)

    try {
      await updatePricing({
        basePricing: {
          basePrice: pricingConfig.basePrice,
          pricePerHour: pricingConfig.pricePerHour,
          minimumPrice: pricingConfig.minimumPrice,
          maximumPrice: pricingConfig.maximumPrice,
        },
        locationMultiplier: pricingConfig.locationMultiplier,
        seasonalMultiplier: pricingConfig.seasonalMultiplier,
        competitorAdjustment: pricingConfig.competitorAdjustment,
        profitMargin: pricingConfig.profitMargin,
      })

      toast({
        title: "Pricing Updated",
        description: "Your pricing configuration has been saved successfully.",
      })
    } catch (error: any) {
      toast({
        title: "Update Failed",
        description: error.message || "Failed to update pricing configuration",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${Math.round((value - 1) * 100)}%`
  }

  if (!currentPricing) {
    return <div>Loading pricing configuration...</div>
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Pricing Configuration</h1>
        <p className="text-muted-foreground">
          Configure your base pricing, multipliers, and profit margins for accurate estimates.
        </p>
      </div>

      <div className="grid gap-6">
        {/* Base Pricing */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Base Pricing
            </CardTitle>
            <CardDescription>Set your fundamental pricing structure for detailing services.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="basePrice">Base Service Price</Label>
                <Input
                  id="basePrice"
                  type="number"
                  value={pricingConfig.basePrice}
                  onChange={(e) =>
                    setPricingConfig((prev) => ({
                      ...prev,
                      basePrice: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                />
                <p className="text-sm text-muted-foreground">Starting price for a standard detailing service</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="pricePerHour">Hourly Rate</Label>
                <Input
                  id="pricePerHour"
                  type="number"
                  value={pricingConfig.pricePerHour}
                  onChange={(e) =>
                    setPricingConfig((prev) => ({
                      ...prev,
                      pricePerHour: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                />
                <p className="text-sm text-muted-foreground">Labor cost per hour for duration calculations</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="minimumPrice">Minimum Price</Label>
                <Input
                  id="minimumPrice"
                  type="number"
                  value={pricingConfig.minimumPrice}
                  onChange={(e) =>
                    setPricingConfig((prev) => ({
                      ...prev,
                      minimumPrice: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                />
                <p className="text-sm text-muted-foreground">Lowest price you'll charge for any service</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="maximumPrice">Maximum Price</Label>
                <Input
                  id="maximumPrice"
                  type="number"
                  value={pricingConfig.maximumPrice}
                  onChange={(e) =>
                    setPricingConfig((prev) => ({
                      ...prev,
                      maximumPrice: Number.parseFloat(e.target.value) || 0,
                    }))
                  }
                />
                <p className="text-sm text-muted-foreground">Price ceiling to prevent extreme estimates</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Market Adjustments */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Market Adjustments
            </CardTitle>
            <CardDescription>Fine-tune pricing based on market conditions and business strategy.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Location Multiplier</Label>
                  <span className="text-sm font-medium">{formatPercentage(pricingConfig.locationMultiplier)}</span>
                </div>
                <Slider
                  value={[pricingConfig.locationMultiplier]}
                  onValueChange={([value]) =>
                    setPricingConfig((prev) => ({
                      ...prev,
                      locationMultiplier: value,
                    }))
                  }
                  min={0.5}
                  max={2.0}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Adjust pricing based on your geographic location and local market rates
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Seasonal Multiplier</Label>
                  <span className="text-sm font-medium">{formatPercentage(pricingConfig.seasonalMultiplier)}</span>
                </div>
                <Slider
                  value={[pricingConfig.seasonalMultiplier]}
                  onValueChange={([value]) =>
                    setPricingConfig((prev) => ({
                      ...prev,
                      seasonalMultiplier: value,
                    }))
                  }
                  min={0.7}
                  max={1.5}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Account for seasonal demand fluctuations (higher in spring/summer)
                </p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Competitor Adjustment</Label>
                  <span className="text-sm font-medium">{formatPercentage(pricingConfig.competitorAdjustment)}</span>
                </div>
                <Slider
                  value={[pricingConfig.competitorAdjustment]}
                  onValueChange={([value]) =>
                    setPricingConfig((prev) => ({
                      ...prev,
                      competitorAdjustment: value,
                    }))
                  }
                  min={0.8}
                  max={1.3}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">Position your pricing relative to local competitors</p>
              </div>

              <Separator />

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <Label>Profit Margin</Label>
                  <span className="text-sm font-medium">{Math.round(pricingConfig.profitMargin * 100)}%</span>
                </div>
                <Slider
                  value={[pricingConfig.profitMargin]}
                  onValueChange={([value]) =>
                    setPricingConfig((prev) => ({
                      ...prev,
                      profitMargin: value,
                    }))
                  }
                  min={0.1}
                  max={0.5}
                  step={0.05}
                  className="w-full"
                />
                <p className="text-sm text-muted-foreground">
                  Target profit margin after covering labor, materials, and overhead
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Preview */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing Preview</CardTitle>
            <CardDescription>See how your configuration affects pricing for different scenarios.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 border rounded-lg">
                <h4 className="font-medium">Basic Service</h4>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(pricingConfig.basePrice * pricingConfig.locationMultiplier)}
                </p>
                <p className="text-sm text-muted-foreground">Standard exterior + interior</p>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium">Premium Service</h4>
                <p className="text-2xl font-bold text-blue-600">
                  {formatCurrency(pricingConfig.basePrice * 1.4 * pricingConfig.locationMultiplier)}
                </p>
                <p className="text-sm text-muted-foreground">Full detail + wax</p>
              </div>

              <div className="p-4 border rounded-lg">
                <h4 className="font-medium">Luxury Service</h4>
                <p className="text-2xl font-bold text-purple-600">
                  {formatCurrency(pricingConfig.basePrice * 1.8 * pricingConfig.locationMultiplier)}
                </p>
                <p className="text-sm text-muted-foreground">Complete detail + ceramic</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Save Button */}
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={isLoading} size="lg">
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Configuration
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
