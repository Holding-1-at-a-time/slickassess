"use client"

import type React from "react"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Save, DollarSign, Settings, TrendingUp } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Separator } from "@/components/ui/separator"
import type { Id } from "@/convex/_generated/dataModel"

export default function PricingConfigurationPage() {
  const { toast } = useToast()
  const [isLoading, setIsLoading] = useState(false)

  // Get current tenant (you'll need to implement tenant selection)
  const tenantId = "your-tenant-id" as Id<"tenants"> // Replace with actual tenant selection logic

  const pricingConfig = useQuery(api.pricing.getPricingConfig, { tenantId })
  const updatePricingConfig = useMutation(api.pricing.updatePricingConfig)

  const [formData, setFormData] = useState({
    basePrices: {
      exteriorWash: 25,
      interiorCleaning: 35,
      waxing: 50,
      detailing: 150,
      paintCorrection: 300,
      ceramicCoating: 800,
      engineCleaning: 75,
      headlightRestoration: 100,
      scratchRepair: 150,
      dentRepair: 200,
    },
    laborRate: 45,
    markupPercentage: 25,
    minimumCharge: 50,
    rushOrderMultiplier: 1.5,
    discountThresholds: {
      volume: {
        threshold: 10,
        discount: 10,
      },
      loyalty: {
        threshold: 12,
        discount: 15,
      },
    },
  })

  // Update form data when pricing config loads
  useState(() => {
    if (pricingConfig) {
      setFormData({
        basePrices: pricingConfig.basePrices,
        laborRate: pricingConfig.laborRate,
        markupPercentage: pricingConfig.markupPercentage,
        minimumCharge: pricingConfig.minimumCharge,
        rushOrderMultiplier: pricingConfig.rushOrderMultiplier,
        discountThresholds: pricingConfig.discountThresholds,
      })
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      await updatePricingConfig({
        tenantId,
        ...formData,
      })

      toast({
        title: "Configuration Updated",
        description: "Pricing configuration has been successfully updated.",
      })
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update pricing configuration",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateBasePrice = (service: string, value: number) => {
    setFormData((prev) => ({
      ...prev,
      basePrices: {
        ...prev.basePrices,
        [service]: value,
      },
    }))
  }

  const updateDiscountThreshold = (type: "volume" | "loyalty", field: "threshold" | "discount", value: number) => {
    setFormData((prev) => ({
      ...prev,
      discountThresholds: {
        ...prev.discountThresholds,
        [type]: {
          ...prev.discountThresholds[type],
          [field]: value,
        },
      },
    }))
  }

  if (pricingConfig === undefined) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Pricing Configuration</h1>
          <p className="text-muted-foreground">
            Configure base prices, multipliers, and discount thresholds for dynamic pricing
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <Tabs defaultValue="services" className="space-y-6">
          <TabsList>
            <TabsTrigger value="services">Service Prices</TabsTrigger>
            <TabsTrigger value="settings">General Settings</TabsTrigger>
            <TabsTrigger value="discounts">Discounts</TabsTrigger>
          </TabsList>

          <TabsContent value="services">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Base Service Prices
                </CardTitle>
                <CardDescription>
                  Set the base prices for each service. These will be adjusted based on vehicle size, damage, and other
                  factors.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(formData.basePrices).map(([service, price]) => (
                    <div key={service} className="space-y-2">
                      <Label htmlFor={service} className="capitalize">
                        {service.replace(/([A-Z])/g, " $1").trim()}
                      </Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          id={service}
                          type="number"
                          min="0"
                          step="0.01"
                          value={price}
                          onChange={(e) => updateBasePrice(service, Number.parseFloat(e.target.value) || 0)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    General Settings
                  </CardTitle>
                  <CardDescription>Configure labor rates, markup, and other general pricing settings.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="laborRate">Labor Rate (per hour)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          id="laborRate"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.laborRate}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, laborRate: Number.parseFloat(e.target.value) || 0 }))
                          }
                          className="pl-8"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="markupPercentage">Markup Percentage</Label>
                      <div className="relative">
                        <Input
                          id="markupPercentage"
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={formData.markupPercentage}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              markupPercentage: Number.parseFloat(e.target.value) || 0,
                            }))
                          }
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                          %
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="minimumCharge">Minimum Charge</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                          $
                        </span>
                        <Input
                          id="minimumCharge"
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.minimumCharge}
                          onChange={(e) =>
                            setFormData((prev) => ({ ...prev, minimumCharge: Number.parseFloat(e.target.value) || 0 }))
                          }
                          className="pl-8"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="rushOrderMultiplier">Rush Order Multiplier</Label>
                      <div className="relative">
                        <Input
                          id="rushOrderMultiplier"
                          type="number"
                          min="1"
                          max="5"
                          step="0.1"
                          value={formData.rushOrderMultiplier}
                          onChange={(e) =>
                            setFormData((prev) => ({
                              ...prev,
                              rushOrderMultiplier: Number.parseFloat(e.target.value) || 1,
                            }))
                          }
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                          ×
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Pricing Multipliers</CardTitle>
                  <CardDescription>
                    These multipliers are automatically applied based on vehicle and service characteristics.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium mb-2">Vehicle Size Multipliers</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                        <div>Compact: 1.0×</div>
                        <div>Midsize: 1.2×</div>
                        <div>Full-size: 1.4×</div>
                        <div>SUV: 1.6×</div>
                        <div>Truck: 1.8×</div>
                        <div>Van: 2.0×</div>
                        <div>Luxury: 2.2×</div>
                        <div>Exotic: 3.0×</div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">Damage Severity Multipliers</h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                        <div>None: 1.0×</div>
                        <div>Minor: 1.15×</div>
                        <div>Moderate: 1.35×</div>
                        <div>Severe: 1.65×</div>
                        <div>Extensive: 2.0×</div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium mb-2">Filthiness Multipliers</h4>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-sm">
                        <div>Clean: 1.0×</div>
                        <div>Light: 1.1×</div>
                        <div>Moderate: 1.25×</div>
                        <div>Heavy: 1.5×</div>
                        <div>Extreme: 2.0×</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="discounts">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Discount Thresholds
                </CardTitle>
                <CardDescription>Configure automatic discounts for volume and loyalty customers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium">Volume Discount</h4>
                    <div className="space-y-2">
                      <Label htmlFor="volumeThreshold">Minimum Assessments</Label>
                      <Input
                        id="volumeThreshold"
                        type="number"
                        min="1"
                        value={formData.discountThresholds.volume.threshold}
                        onChange={(e) =>
                          updateDiscountThreshold("volume", "threshold", Number.parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="volumeDiscount">Discount Percentage</Label>
                      <div className="relative">
                        <Input
                          id="volumeDiscount"
                          type="number"
                          min="0"
                          max="50"
                          step="0.1"
                          value={formData.discountThresholds.volume.discount}
                          onChange={(e) =>
                            updateDiscountThreshold("volume", "discount", Number.parseFloat(e.target.value) || 0)
                          }
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                          %
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium">Loyalty Discount</h4>
                    <div className="space-y-2">
                      <Label htmlFor="loyaltyThreshold">Minimum Months as Client</Label>
                      <Input
                        id="loyaltyThreshold"
                        type="number"
                        min="1"
                        value={formData.discountThresholds.loyalty.threshold}
                        onChange={(e) =>
                          updateDiscountThreshold("loyalty", "threshold", Number.parseInt(e.target.value) || 0)
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loyaltyDiscount">Discount Percentage</Label>
                      <div className="relative">
                        <Input
                          id="loyaltyDiscount"
                          type="number"
                          min="0"
                          max="50"
                          step="0.1"
                          value={formData.discountThresholds.loyalty.discount}
                          onChange={(e) =>
                            updateDiscountThreshold("loyalty", "discount", Number.parseFloat(e.target.value) || 0)
                          }
                        />
                        <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                          %
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end pt-6">
          <Button type="submit" disabled={isLoading}>
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
      </form>
    </div>
  )
}
