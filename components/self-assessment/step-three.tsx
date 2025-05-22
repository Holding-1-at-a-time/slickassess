"use client"

import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { AssessmentInfoSchema } from "@/lib/validations/self-assessment-schema"
import { FormError } from "@/components/ui/form-error"

interface StepThreeProps {
  assessmentInfo: AssessmentInfoSchema
  updateAssessmentInfo: (field: keyof AssessmentInfoSchema, value: boolean | string) => void
  nextStep: () => void
  prevStep: () => void
  getFieldError: (field: string) => string | undefined
}

export function StepThree({ assessmentInfo, updateAssessmentInfo, nextStep, prevStep, getFieldError }: StepThreeProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Vehicle Condition</h2>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="scratches"
            checked={assessmentInfo.hasScratches}
            onCheckedChange={(checked) => updateAssessmentInfo("hasScratches", checked === true)}
          />
          <Label htmlFor="scratches">Vehicle has visible scratches or paint damage</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="dents"
            checked={assessmentInfo.hasDents}
            onCheckedChange={(checked) => updateAssessmentInfo("hasDents", checked === true)}
          />
          <Label htmlFor="dents">Vehicle has dents or body damage</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="rust"
            checked={assessmentInfo.hasRust}
            onCheckedChange={(checked) => updateAssessmentInfo("hasRust", checked === true)}
          />
          <Label htmlFor="rust">Vehicle has rust or corrosion</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="interior"
            checked={assessmentInfo.hasInteriorDamage}
            onCheckedChange={(checked) => updateAssessmentInfo("hasInteriorDamage", checked === true)}
          />
          <Label htmlFor="interior">Vehicle has interior damage</Label>
        </div>
      </div>

      <div className="space-y-2 pt-4">
        <Label htmlFor="notes">Additional Notes</Label>
        <Textarea
          id="notes"
          value={assessmentInfo.notes || ""}
          onChange={(e) => updateAssessmentInfo("notes", e.target.value)}
          placeholder="Please describe any issues or concerns about your vehicle..."
          rows={4}
          className={getFieldError("notes") ? "border-red-500" : ""}
        />
        {getFieldError("notes") && <FormError message={getFieldError("notes")} />}
      </div>

      {getFieldError("form") && <FormError message={getFieldError("form")} />}

      <div className="flex justify-between pt-4 gap-4">
        <Button variant="outline" onClick={prevStep} className="flex-1">
          Back
        </Button>
        <Button onClick={nextStep} className="flex-1">
          Next: Upload Photos
        </Button>
      </div>
    </div>
  )
}
