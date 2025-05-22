"use client"

import type React from "react"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Plus, Trash2, Edit, Save } from "lucide-react"
import { formatCurrency } from "@/utils/format-currency"

export default function RepairCostsPage() {
  const [activeTab, setActiveTab] = useState("view")
  const [formData, setFormData] = useState({
    id: null as Id<"repairCosts"> | null,
    damageType: "",
    vehicleType: "sedan",
    severity: "moderate",
    location: "",
    minCost: 0,
    maxCost: 0,
    averageCost: 0,
    laborHours: 0,
    partsCost: 0,
    notes: "",
  })
  const [editingId, setEditingId] = useState<Id<"repairCosts"> | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const toast = useToast()

  // Queries and mutations
  const repairCosts = useQuery(api.repairCosts.getAllRepairCosts) || []
  const upsertRepairCost = useMutation(api.repairCosts.upsertRepairCost)
  const deleteRepairCost = useMutation(api.repairCosts.deleteRepairCost)

  // Handle form input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target

    if (["minCost", "maxCost", "averageCost", "laborHours", "partsCost"].includes(name)) {
      setFormData({
        ...formData,
        [name]: Number.parseFloat(value) || 0,
      })
    } else {
      setFormData({
        ...formData,
        [name]: value,
      })
    }

    // Auto-calculate average cost when min or max changes
    if (name === "minCost" || name === "maxCost") {
      const minCost = name === "minCost" ? Number.parseFloat(value) || 0 : formData.minCost
      const maxCost = name === "maxCost" ? Number.parseFloat(value) || 0 : formData.maxCost

      setFormData((prev) => ({
        ...prev,
        [name]: Number.parseFloat(value) || 0,
        averageCost: Math.round((minCost + maxCost) / 2),
      }))
    }
  }

  // Handle select changes
  const handleSelectChange = (name: string, value: string) => {
    setFormData({
      ...formData,
      [name]: value,
    })
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const result = await upsertRepairCost({
        id: formData.id || undefined,
        damageType: formData.damageType,
        vehicleType: formData.vehicleType,
        severity: formData.severity,
        location: formData.location,
        minCost: formData.minCost,
        maxCost: formData.maxCost,
        averageCost: formData.averageCost,
        laborHours: formData.laborHours || undefined,
        partsCost: formData.partsCost || undefined,
        notes: formData.notes || undefined,
      })

      toast({
        title: formData.id ? "Cost updated" : "Cost added",
        description: `Repair cost for ${formData.damageType} has been ${formData.id ? "updated" : "added"} successfully.`,
      })

      // Reset form
      setFormData({
        id: null,
        damageType: "",
        vehicleType: "sedan",
        severity: "moderate",
        location: "",
        minCost: 0,
        maxCost: 0,
        averageCost: 0,
        laborHours: 0,
        partsCost: 0,
        notes: "",
      })

      setEditingId(null)
      setActiveTab("view")
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "An error occurred",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle edit
  const handleEdit = (cost: any) => {
    setFormData({
      id: cost._id,
      damageType: cost.damageType,
      vehicleType: cost.vehicleType,
      severity: cost.severity,
      location: cost.location,
      minCost: cost.minCost,
      maxCost: cost.maxCost,
      averageCost: cost.averageCost,
      laborHours: cost.laborHours || 0,
      partsCost: cost.partsCost || 0,
      notes: cost.notes || "",
    })

    setEditingId(cost._id)
    setActiveTab("add")
  }

  // Handle delete
  const handleDelete = async (id: Id<"repairCosts">) => {
    if (confirm("Are you sure you want to delete this repair cost?")) {
      try {
        await deleteRepairCost({ id })

        toast({
          title: "Cost deleted",
          description: "Repair cost has been deleted successfully.",
        })
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "An error occurred",
          variant: "destructive",
        })
      }
    }
  }

  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6">Repair Cost Management</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="view">View Costs</TabsTrigger>
          <TabsTrigger value="add">{editingId ? "Edit Cost" : "Add New Cost"}</TabsTrigger>
        </TabsList>

        <TabsContent value="view">
          <Card>
            <CardHeader>
              <CardTitle>Repair Costs</CardTitle>
              <CardDescription>View and manage repair costs for different types of vehicle damage</CardDescription>
            </CardHeader>
            <CardContent>
              {repairCosts.length === 0 ? (
                <div className="text-center py-10">
                  <p className="text-muted-foreground mb-4">No repair costs defined yet</p>
                  <Button onClick={() => setActiveTab("add")}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Cost
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Damage Type</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Severity</TableHead>
                        <TableHead>Vehicle Type</TableHead>
                        <TableHead>Min Cost</TableHead>
                        <TableHead>Max Cost</TableHead>
                        <TableHead>Average</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {repairCosts.map((cost) => (
                        <TableRow key={cost._id}>
                          <TableCell className="font-medium">{cost.damageType}</TableCell>
                          <TableCell>{cost.location}</TableCell>
                          <TableCell>{cost.severity}</TableCell>
                          <TableCell>{cost.vehicleType}</TableCell>
                          <TableCell>{formatCurrency(cost.minCost)}</TableCell>
                          <TableCell>{formatCurrency(cost.maxCost)}</TableCell>
                          <TableCell>{formatCurrency(cost.averageCost)}</TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button variant="outline" size="sm" onClick={() => handleEdit(cost)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleDelete(cost._id)}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="add">
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? "Edit Repair Cost" : "Add New Repair Cost"}</CardTitle>
              <CardDescription>
                {editingId ? "Update the repair cost details" : "Define costs for different types of vehicle damage"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="damageType">Damage Type</Label>
                    <Input
                      id="damageType"
                      name="damageType"
                      value={formData.damageType}
                      onChange={handleInputChange}
                      placeholder="e.g., Scratch, Dent, Rust"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    <Input
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleInputChange}
                      placeholder="e.g., Door, Hood, Bumper"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="severity">Severity</Label>
                    <Select value={formData.severity} onValueChange={(value) => handleSelectChange("severity", value)}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="minor">Minor</SelectItem>
                        <SelectItem value="moderate">Moderate</SelectItem>
                        <SelectItem value="severe">Severe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="vehicleType">Vehicle Type</Label>
                    <Select
                      value={formData.vehicleType}
                      onValueChange={(value) => handleSelectChange("vehicleType", value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select vehicle type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="sedan">Sedan</SelectItem>
                        <SelectItem value="suv">SUV</SelectItem>
                        <SelectItem value="truck">Truck</SelectItem>
                        <SelectItem value="luxury">Luxury</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="minCost">Minimum Cost ($)</Label>
                    <Input
                      id="minCost"
                      name="minCost"
                      type="number"
                      value={formData.minCost}
                      onChange={handleInputChange}
                      min={0}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxCost">Maximum Cost ($)</Label>
                    <Input
                      id="maxCost"
                      name="maxCost"
                      type="number"
                      value={formData.maxCost}
                      onChange={handleInputChange}
                      min={0}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="averageCost">Average Cost ($)</Label>
                    <Input
                      id="averageCost"
                      name="averageCost"
                      type="number"
                      value={formData.averageCost}
                      onChange={handleInputChange}
                      min={0}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="laborHours">Labor Hours (optional)</Label>
                    <Input
                      id="laborHours"
                      name="laborHours"
                      type="number"
                      value={formData.laborHours}
                      onChange={handleInputChange}
                      min={0}
                      step={0.5}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="partsCost">Parts Cost ($) (optional)</Label>
                    <Input
                      id="partsCost"
                      name="partsCost"
                      type="number"
                      value={formData.partsCost}
                      onChange={handleInputChange}
                      min={0}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="notes">Notes (optional)</Label>
                    <Input
                      id="notes"
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      placeholder="Additional information about this repair cost"
                    />
                  </div>
                </div>

                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setFormData({
                        id: null,
                        damageType: "",
                        vehicleType: "sedan",
                        severity: "moderate",
                        location: "",
                        minCost: 0,
                        maxCost: 0,
                        averageCost: 0,
                        laborHours: 0,
                        partsCost: 0,
                        notes: "",
                      })
                      setEditingId(null)
                      setActiveTab("view")
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        {editingId ? "Updating..." : "Saving..."}
                      </>
                    ) : (
                      <>
                        <Save className="mr-2 h-4 w-4" />
                        {editingId ? "Update" : "Save"}
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
