"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { detectVehicleDamage } from "@/lib/ai/damage-detection"
import { AIFeedbackForm } from "@/components/ai-feedback-form"
import { Loader2, Scan, AlertTriangle } from "lucide-react"
import type { Id } from "@/convex/_generated/dataModel"

interface AIDamageDetectorProps {
  imageUrl: string
  imageId: Id<"vehicleImages">
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Damage Detection</CardTitle>
        <CardDescription>Automatically detect damage in this image</CardDescription>
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
          <p className="text-sm text-muted-foreground mb-4">
            Our AI will analyze the image and identify any damage, including scratches, dents, cracks, and rust.
          </p>
        )}

        {detectionResult && !showFeedback && (
          <div className="space-y-4">
            <p className="text-sm font-medium">Detected {detectionResult.annotations.length} damage areas:</p>
            <ul className="list-disc pl-5 space-y-1">
              {detectionResult.annotations.map((anno: any) => (
                <li key={anno.id} className="text-sm">
                  {anno.category} ({anno.severity} severity)
                </li>
              ))}
            </ul>
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
          <Button onClick={handleDetectDamage} disabled={isDetecting}>
            {isDetecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Detecting...
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
