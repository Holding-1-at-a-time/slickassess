"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { ThumbsUp, ThumbsDown, Edit, Loader2 } from "lucide-react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

interface AIFeedbackFormProps {
  imageId: Id<"vehicleImages">
  assessmentId?: Id<"assessments">
  originalPredictions: Array<{
    id: string
    type: string
    confidence: number
    boundingBox: {
      x: number
      y: number
      width: number
      height: number
    }
    category: string
    severity: string
  }>
  currentAnnotations: Array<{
    id: string
    type: string
    x: number
    y: number
    width?: number
    height?: number
    radius?: number
    category: string
    severity: string
  }>
  onFeedbackSubmitted?: () => void
}

export function AIFeedbackForm({
  imageId,
  assessmentId,
  originalPredictions,
  currentAnnotations,
  onFeedbackSubmitted,
}: AIFeedbackFormProps) {
  const [feedbackType, setFeedbackType] = useState<"confirmation" | "correction" | "rejection">("confirmation")
  const [feedbackNotes, setFeedbackNotes] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const saveFeedbackMutation = useMutation(api.aiTraining.saveFeedback)

  const handleSubmitFeedback = async () => {
    setIsSubmitting(true)
    try {
      await saveFeedbackMutation({
        imageId,
        assessmentId,
        originalPredictions,
        correctedAnnotations: currentAnnotations,
        feedbackType,
        feedbackNotes: feedbackNotes || undefined,
      })

      toast({
        title: "Feedback Submitted",
        description: "Thank you for helping improve our AI model!",
      })

      if (onFeedbackSubmitted) {
        onFeedbackSubmitted()
      }

      // Reset the form
      setFeedbackType("confirmation")
      setFeedbackNotes("")
    } catch (error: any) {
      console.error("Error submitting feedback:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to submit feedback",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>AI Feedback</CardTitle>
        <CardDescription>Help improve our AI by providing feedback on the damage detection</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>How accurate was the AI detection?</Label>
          <RadioGroup value={feedbackType} onValueChange={(value) => setFeedbackType(value as any)}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="confirmation" id="confirmation" />
              <Label htmlFor="confirmation" className="flex items-center">
                <ThumbsUp className="mr-2 h-4 w-4 text-green-500" />
                Accurate (I confirmed all detections)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="correction" id="correction" />
              <Label htmlFor="correction" className="flex items-center">
                <Edit className="mr-2 h-4 w-4 text-amber-500" />
                Partially Accurate (I made some corrections)
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="rejection" id="rejection" />
              <Label htmlFor="rejection" className="flex items-center">
                <ThumbsDown className="mr-2 h-4 w-4 text-red-500" />
                Inaccurate (I rejected and corrected most detections)
              </Label>
            </div>
          </RadioGroup>
        </div>

        <div className="space-y-2">
          <Label htmlFor="feedback-notes">Additional Notes (Optional)</Label>
          <Textarea
            id="feedback-notes"
            placeholder="Please provide any additional feedback about the AI detection..."
            value={feedbackNotes}
            onChange={(e) => setFeedbackNotes(e.target.value)}
            rows={4}
          />
        </div>
      </CardContent>
      <CardFooter>
        <Button onClick={handleSubmitFeedback} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            "Submit Feedback"
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
