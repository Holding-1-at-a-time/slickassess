"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { FormError } from "@/components/ui/form-error"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"

interface StepThreeProps {
  data: {
    description: string
    hasScratches: boolean
    hasDents: boolean
    needsDetailing: boolean
  }
  errors: Record<string, string>
  update: (field: string, value: string | boolean) => void
  next: () => void
  back: () => void
}

export function StepThree({ data, errors, update, next, back }: StepThreeProps) {
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})

  const handleNext = () => {
    // Validate description
    const newErrors: Record<string, string> = {}

    if (!data.description.trim()) {
      newErrors.description = "Please provide a description of the service needed"
    } else if (data.description.length < 10) {
      newErrors.description = "Description is too short"
    }

    if (Object.keys(newErrors).length > 0) {
      setLocalErrors(newErrors)
      return
    }

    setLocalErrors({})
    next()
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="description">Describe what service you need for your vehicle</Label>
        <Textarea
          id="description"
          value={data.description}
          onChange={(e) => update("description", e.target.value)}
          placeholder="Please describe what service you need..."
          rows={5}
          className={errors.description || localErrors.description ? "border-red-500" : ""}
        />
        {(errors.description || localErrors.description) && (
          <FormError message={errors.description || localErrors.description} />
        )}
      </div>

      <div className="space-y-4">
        <Label>Vehicle Condition</Label>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="hasScratches"
            checked={data.hasScratches}
            onCheckedChange={(checked) => update("hasScratches", Boolean(checked))}
          />
          <Label htmlFor="hasScratches" className="cursor-pointer">
            My vehicle has scratches that need repair
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="hasDents"
            checked={data.hasDents}
            onCheckedChange={(checked) => update("hasDents", Boolean(checked))}
          />
          <Label htmlFor="hasDents" className="cursor-pointer">
            My vehicle has dents that need repair
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="needsDetailing"
            checked={data.needsDetailing}
            onCheckedChange={(checked) => update("needsDetailing", Boolean(checked))}
          />
          <Label htmlFor="needsDetailing" className="cursor-pointer">
            I'm interested in detailing services
          </Label>
        </div>
      </div>

      <div className="flex justify-between pt-4">
        <Button type="button" variant="outline" onClick={back}>
          Back
        </Button>
        <Button type="button" onClick={handleNext}>
          Next
        </Button>
      </div>
    </div>
  )
}
