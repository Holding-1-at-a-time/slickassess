"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/components/ui/use-toast"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Loader2, ThumbsUp, ThumbsDown, Send } from "lucide-react"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"

interface AIFeedbackFormProps {
  imageId: Id<"images">
  assessmentId?: Id<"assessments">
  originalPredictions: any[]
  currentAnnotations: any[]
  onFeedbackSubmitted: () => void
}

export function AIFeedbackForm({
  imageId,
  assessmentId,
  originalPredictions,
  currentAnnotations,
  onFeedbackSubmitted,
}: AIFeedbackFormProps) {
  const [feedbackRating, setFeedbackRating] = useState<"accurate" | "inaccurate" | null>(null)
  const [feedbackText, setFeedbackText] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const submitAIFeedback = useMutation(api.ai.submitFeedback)

  const handleSubmitFeedback = async () => {
    if (!feedbackRating) {
      toast({
        title: "Please select a rating",
        description: "Let us know if the AI detection was accurate or inaccurate",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)
    try {
      await submitAIFeedback({
        imageId,
        assessmentId,
        rating: feedbackRating,
        feedback: feedbackText,
        originalPredictions,
        finalAnnotations: currentAnnotations,
      })

      toast({
        title: "Feedback Submitted",
        description: "Thank you for helping us improve our AI detection",
      })

      onFeedbackSubmitted()
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
    <div className="space-y-4">
      <h3 className="text-lg font-medium">How accurate was the AI detection?</h3>

      <RadioGroup value={feedbackRating || ""} onValueChange={(value) => setFeedbackRating(value as any)}>
        <div className="flex space-x-4">
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="accurate" id="accurate" />
            <Label htmlFor="accurate" className="flex items-center">
              <ThumbsUp className="h-4 w-4 mr-1 text-green-500" />
              Accurate
            </Label>
          </div>

          <div className="flex items-center space-x-2">
            <RadioGroupItem value="inaccurate" id="inaccurate" />
            <Label htmlFor="inaccurate" className="flex items-center">
              <ThumbsDown className="h-4 w-4 mr-1 text-red-500" />
              Inaccurate
            </Label>
          </div>
        </div>
      </RadioGroup>

      <div>
        <Label htmlFor="feedback" className="block mb-2">
          Additional feedback (optional)
        </Label>
        <Textarea
          id="feedback"
          placeholder="Please provide any additional feedback about the AI detection..."
          value={feedbackText}
          onChange={(e) => setFeedbackText(e.target.value)}
          rows={4}
        />
      </div>

      <Button onClick={handleSubmitFeedback} disabled={isSubmitting || !feedbackRating} className="w-full">
        {isSubmitting ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            Submit Feedback
          </>
        )}
      </Button>
    </div>
  )
}
