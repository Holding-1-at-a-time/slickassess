"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { detectVehicleDamage } from "@/lib/ai/damage-detection"
import { AIFeedbackForm } from "@/components/ai-feedback-form"
import { Loader2, Scan, AlertTriangle, Check, Info } from "lucide-react"
import type { Id } from "@/convex/_generated/dataModel"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"

interface AIDamageDetectorProps {
  imageUrl: string
  imageId: Id<"images">
  vehicleId: Id<"vehicles">
  assessmentId?: Id<"assessments">
  onDetectionComplete?: () => void
}

export function AIDamageDetector({
  imageUrl,
  imageId,
  vehicleId,
  assessmentId,
  onDetectionComplete,
}: AIDamageDetectorProps) {
  const [isDetecting, setIsDetecting] = useState(false)
  const [detectionResult, setDetectionResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)

  const handleDetectDamage = async () => {
    setIsDetecting(true)
    setError(null)
    try {
      const result = await detectVehicleDamage(imageUrl, imageId, vehicleId, assessmentId)
      setDetectionResult(result)
      setShowFeedback(true)

      if (onDetectionComplete) {
        onDetectionComplete()
      }

      toast({
        title: "Damage Detection Complete",
        description: `Detected ${result.annotations.length} damage areas.`,
      })
    } catch (error: any) {
      console.error("Error detecting damage:", error)
      setError(error.message || "Failed to detect damage")
      toast({
        title: "Error",
        description: error.message || "Failed to detect damage",
        variant: "destructive",
      })
    } finally {
      setIsDetecting(false)
    }
  }

  const handleFeedbackSubmitted = () => {
    setShowFeedback(false)
    setDetectionResult(null)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "minor":
        return "bg-yellow-500"
      case "moderate":
        return "bg-orange-500"
      case "severe":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Scan className="mr-2 h-5 w-5 text-[#00AE98]" />
          AI Damage Detection
        </CardTitle>
        <CardDescription>Automatically detect and classify vehicle damage using AI</CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md p-4 mb-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-500 dark:text-red-400">{error}</p>
            </div>
          </div>
        )}

        {!showFeedback && !detectionResult && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Our AI will analyze the image and identify any damage, including scratches, dents, cracks, and rust.
            </p>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-md p-4">
              <div className="flex">
                <Info className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0" />
                <div className="text-sm text-blue-500 dark:text-blue-400">
                  <p className="font-medium mb-1">How it works:</p>
                  <ol className="list-decimal pl-5 space-y-1">
                    <li>AI analyzes the vehicle image</li>
                    <li>Detects and classifies damage types</li>
                    <li>Assesses severity and location</li>
                    <li>Creates annotations you can review</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        )}

        {detectionResult && !showFeedback && (
          <div className="space-y-4">
            <div className="flex items-center space-x-2 mb-2">
              <Check className="h-5 w-5 text-green-500" />
              <p className="font-medium">Analysis complete</p>
            </div>

            {detectionResult.summary && (
              <div className="bg-neutral-100 dark:bg-neutral-800 p-3 rounded-md">
                <p className="text-sm font-medium mb-1">Summary:</p>
                <p className="text-sm">{detectionResult.summary}</p>
              </div>
            )}

            <p className="text-sm font-medium">Detected {detectionResult.annotations.length} damage areas:</p>

            <Accordion type="single" collapsible className="w-full">
              {detectionResult.annotations.map((anno: any, index: number) => (
                <AccordionItem key={anno.id} value={anno.id}>
                  <AccordionTrigger className="py-2">
                    <div className="flex items-center">
                      <Badge className={`mr-2 ${getSeverityColor(anno.severity)}`}>{anno.severity}</Badge>
                      <span className="capitalize">
                        {anno.category || "Damage"} {index + 1}
                      </span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="pl-2 border-l-2 border-neutral-200 dark:border-neutral-700">
                      <p className="text-sm mb-1">
                        <span className="font-medium">Type:</span> {anno.category}
                      </p>
                      {anno.description && (
                        <p className="text-sm mb-1">
                          <span className="font-medium">Description:</span> {anno.description}
                        </p>
                      )}
                      {anno.confidence && (
                        <p className="text-sm mb-1">
                          <span className="font-medium">Confidence:</span> {(anno.confidence * 100).toFixed(0)}%
                        </p>
                      )}
                      <p className="text-sm">
                        <span className="font-medium">Severity:</span> {anno.severity}
                      </p>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        )}

        {showFeedback && detectionResult && (
          <AIFeedbackForm
            imageId={imageId}
            assessmentId={assessmentId}
            originalPredictions={detectionResult.detectedDamage}
            currentAnnotations={detectionResult.annotations}
            onFeedbackSubmitted={handleFeedbackSubmitted}
          />
        )}
      </CardContent>
      <CardFooter>
        {!showFeedback && (
          <Button
            onClick={handleDetectDamage}
            disabled={isDetecting}
            className="w-full bg-[#00AE98] hover:bg-[#00967f]"
          >
            {isDetecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Analyzing image...
              </>
            ) : (
              <>
                <Scan className="mr-2 h-4 w-4" />
                Detect Damage
              </>
            )}
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
