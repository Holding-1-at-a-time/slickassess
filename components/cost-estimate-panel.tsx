"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Loader2, AlertCircle, DollarSign, FileText, CheckCircle, PencilLine } from "lucide-react"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { formatCurrency } from "@/utils/format-currency"

interface CostEstimatePanelProps {
  assessmentId: Id<"assessments">
  vehicleId: Id<"vehicles">
  aiAnalysisResults?: any[]
  vehicleType?: string
  onEstimateGenerated?: (estimateId: Id<"costEstimates">) => void
}

export function CostEstimatePanel({
  assessmentId,
  vehicleId,
  aiAnalysisResults,
  vehicleType,
  onEstimateGenerated,
}: CostEstimatePanelProps) {
  const [isGenerating, setIsGenerating] = useState(false)
  const [notes, setNotes] = useState("")
  const [editingLineItemId, setEditingLineItemId] = useState<string | null>(null)
  const [lineItemEdits, setLineItemEdits] = useState<Record<string, { selectedCost: number; notes: string }>>({})

  const toast = useToast()

  // Get existing cost estimate
  const estimate = useQuery(api.repairCosts.getCostEstimate, { assessmentId })

  // Mutations
  const generateEstimate = useMutation(api.repairCosts.generateCostEstimate)
  const updateEstimateStatus = useMutation(api.repairCosts.updateEstimateStatus)
  const updateLineItem = useMutation(api.repairCosts.updateEstimateLineItem)

  // Initialize line item edits when estimate loads
  useEffect(() => {
    if (estimate && estimate.lineItems) {
      const initialEdits: Record<string, { selectedCost: number; notes: string }> = {}
      estimate.lineItems.forEach((item) => {
        initialEdits[item.id] = {
          selectedCost: item.selectedCost,
          notes: item.notes || "",
        }
      })
      setLineItemEdits(initialEdits)
    }
  }, [estimate])

  // Handle generate estimate
  const handleGenerateEstimate = async () => {
    if (!aiAnalysisResults || aiAnalysisResults.length === 0) {
      toast({
        title: "No damage detected",
        description: "Please run AI analysis first to detect damage",
        variant: "destructive",
      })
      return
    }

    setIsGenerating(true)

    try {
      // Format AI results for the cost estimation
      const formattedResults = aiAnalysisResults.map((result) => ({
        damageType: result.type || result.category,
        location: result.location || "Unspecified",
        severity: result.severity,
        description: result.description || `${result.severity} ${result.type || result.category}`,
        imageId: result.imageId,
      }))

      const estimateId = await generateEstimate({
        assessmentId,
        vehicleId,
        aiAnalysisResults: formattedResults,
        vehicleType,
        notes,
      })

      toast({
        title: "Cost estimate generated",
        description: "The repair cost estimate has been created successfully",
      })

      if (onEstimateGenerated) {
        onEstimateGenerated(estimateId)
      }
    } catch (error) {
      toast({
        title: "Error generating estimate",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  // Handle status update
  const handleStatusUpdate = async (status: string) => {
    if (!estimate) return

    try {
      await updateEstimateStatus({
        estimateId: estimate._id,
        status,
        notes,
      })

      toast({
        title: "Status updated",
        description: `Estimate status changed to ${status}`,
      })
    } catch (error) {
      toast({
        title: "Error updating status",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    }
  }

  // Handle line item edit
  const handleLineItemEdit = async (lineItemId: string) => {
    if (!estimate) return

    try {
      const edits = lineItemEdits[lineItemId]

      await updateLineItem({
        estimateId: estimate._id,
        lineItemId,
        selectedCost: edits.selectedCost,
        notes: edits.notes,
      })

      setEditingLineItemId(null)

      toast({
        title: "Line item updated",
        description: "The cost estimate has been updated",
      })
    } catch (error) {
      toast({
        title: "Error updating line item",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive",
      })
    }
  }

  // Handle slider change
  const handleSliderChange = (lineItemId: string, value: number[]) => {
    setLineItemEdits((prev) => ({
      ...prev,
      [lineItemId]: {
        ...prev[lineItemId],
        selectedCost: value[0],
      },
    }))
  }

  // Handle notes change
  const handleNotesChange = (lineItemId: string, notes: string) => {
    setLineItemEdits((prev) => ({
      ...prev,
      [lineItemId]: {
        ...prev[lineItemId],
        notes,
      },
    }))
  }

  // Get status badge variant
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return "secondary"
      case "finalized":
        return "default"
      case "approved":
        return "success"
      case "rejected":
        return "destructive"
      default:
        return "outline"
    }
  }

  // Get severity badge variant
  const getSeverityBadge = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "minor":
        return "secondary"
      case "moderate":
        return "default"
      case "severe":
        return "destructive"
      default:
        return "outline"
    }
  }

  if (!estimate && !aiAnalysisResults) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Repair Cost Estimation</CardTitle>
          <CardDescription>Run AI analysis to generate a repair cost estimate based on detected damage</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center p-6">
          <div className="text-center text-muted-foreground">
            <AlertCircle className="mx-auto h-12 w-12 mb-4 text-muted-foreground/50" />
            <p>No damage analysis available</p>
            <p className="text-sm mt-2">Run AI analysis on vehicle images to detect damage</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <DollarSign className="mr-2 h-5 w-5" />
          Repair Cost Estimation
        </CardTitle>
        <CardDescription>
          {estimate
            ? "Review and adjust the repair cost estimate based on AI-detected damage"
            : "Generate a repair cost estimate based on AI-detected damage"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {estimate ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Total Estimate</p>
                <p className="text-2xl font-bold">{formatCurrency(estimate.totalEstimate)}</p>
              </div>
              <Badge variant={getStatusBadge(estimate.status)}>{estimate.status}</Badge>
            </div>

            {estimate.notes && (
              <div className="bg-muted p-3 rounded-md text-sm">
                <p className="font-medium mb-1">Notes:</p>
                <p>{estimate.notes}</p>
              </div>
            )}

            <div className="mt-4">
              <h3 className="text-lg font-medium mb-2">Damage Items</h3>
              <Accordion type="single" collapsible className="w-full">
                {estimate.lineItems.map((item, index) => (
                  <AccordionItem key={item.id} value={item.id}>
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center">
                          <span className="font-medium">
                            {item.damageType} - {item.location}
                          </span>
                          <Badge variant={getSeverityBadge(item.severity)} className="ml-2">
                            {item.severity}
                          </Badge>
                        </div>
                        <span className="font-bold">{formatCurrency(item.selectedCost)}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      {editingLineItemId === item.id ? (
                        <div className="space-y-4 p-2">
                          <div>
                            <p className="text-sm font-medium mb-2">
                              Adjust Cost: {formatCurrency(lineItemEdits[item.id]?.selectedCost)}
                            </p>
                            <Slider
                              value={[lineItemEdits[item.id]?.selectedCost]}
                              min={item.minCost}
                              max={item.maxCost}
                              step={10}
                              onValueChange={(value) => handleSliderChange(item.id, value)}
                              className="mb-6"
                            />
                            <div className="flex justify-between text-xs text-muted-foreground">
                              <span>Min: {formatCurrency(item.minCost)}</span>
                              <span>Max: {formatCurrency(item.maxCost)}</span>
                            </div>
                          </div>

                          <div>
                            <p className="text-sm font-medium mb-1">Notes:</p>
                            <Textarea
                              value={lineItemEdits[item.id]?.notes}
                              onChange={(e) => handleNotesChange(item.id, e.target.value)}
                              placeholder="Add notes about this repair..."
                              className="h-20"
                            />
                          </div>

                          <div className="flex justify-end space-x-2">
                            <Button variant="outline" size="sm" onClick={() => setEditingLineItemId(null)}>
                              Cancel
                            </Button>
                            <Button size="sm" onClick={() => handleLineItemEdit(item.id)}>
                              Save
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2 p-2">
                          <p className="text-sm">
                            <span className="font-medium">Description:</span> {item.description}
                          </p>
                          <p className="text-sm">
                            <span className="font-medium">Cost Range:</span> {formatCurrency(item.minCost)} -{" "}
                            {formatCurrency(item.maxCost)}
                          </p>
                          {item.laborHours && (
                            <p className="text-sm">
                              <span className="font-medium">Labor Hours:</span> {item.laborHours}
                            </p>
                          )}
                          {item.partsCost && (
                            <p className="text-sm">
                              <span className="font-medium">Parts Cost:</span> {formatCurrency(item.partsCost)}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-sm">
                              <span className="font-medium">Notes:</span> {item.notes}
                            </p>
                          )}
                          <div className="pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => setEditingLineItemId(item.id)}
                            >
                              <PencilLine className="h-4 w-4 mr-2" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted p-4 rounded-md">
              <h3 className="text-sm font-medium mb-2">Detected Damage</h3>
              <ul className="space-y-2">
                {aiAnalysisResults &&
                  aiAnalysisResults.map((damage, index) => (
                    <li key={index} className="flex items-center justify-between text-sm">
                      <span>
                        {damage.type || damage.category} ({damage.location || "Unspecified"})
                      </span>
                      <Badge variant={getSeverityBadge(damage.severity)}>{damage.severity}</Badge>
                    </li>
                  ))}
              </ul>
            </div>

            <div>
              <label htmlFor="notes" className="text-sm font-medium">
                Notes
              </label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Add any notes about this estimate..."
                className="mt-1"
              />
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className={estimate ? "flex justify-between" : ""}>
        {estimate ? (
          <>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm" onClick={() => handleGenerateEstimate()} disabled={isGenerating}>
                <FileText className="h-4 w-4 mr-2" />
                Regenerate
              </Button>
            </div>
            <div className="flex space-x-2">
              {estimate.status === "draft" && (
                <Button size="sm" onClick={() => handleStatusUpdate("finalized")}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Finalize
                </Button>
              )}
              {estimate.status === "finalized" && (
                <>
                  <Button variant="outline" size="sm" onClick={() => handleStatusUpdate("rejected")}>
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => handleStatusUpdate("approved")}>
                    Approve
                  </Button>
                </>
              )}
            </div>
          </>
        ) : (
          <Button
            onClick={handleGenerateEstimate}
            disabled={isGenerating || !aiAnalysisResults || aiAnalysisResults.length === 0}
            className="w-full"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Estimate...
              </>
            ) : (
              <>
                <DollarSign className="mr-2 h-4 w-4" />
                Generate Cost Estimate
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
