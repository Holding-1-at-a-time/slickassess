"use client"

import type React from "react"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ImageUploader } from "@/components/image-uploader"
import { Loader2, CheckCircle } from "lucide-react"

interface SelfAssessmentFormProps {
  tenantId: Id<"tenants">
}

export function SelfAssessmentForm({ tenantId }: SelfAssessmentFormProps) {
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    vehicleMake: "",
    vehicleModel: "",
    vehicleYear: "",
    vehicleColor: "",
    description: "",
    images: [] as string[],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)

  // This would be a Convex mutation to submit the assessment
  const submitAssessment = useMutation(api.assessments.createPublicAssessment)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleSelectChange = (name: string, value: string) => {
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageUpload = (imageUrls: string[]) => {
    setFormData((prev) => ({ ...prev, images: [...prev.images, ...imageUrls] }))
  }

  const nextStep = () => setStep((prev) => prev + 1)
  const prevStep = () => setStep((prev) => prev - 1)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // Submit the assessment to Convex
      await submitAssessment({
        tenantId,
        customerInfo: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
        },
        vehicleInfo: {
          make: formData.vehicleMake,
          model: formData.vehicleModel,
          year: Number.parseInt(formData.vehicleYear),
          color: formData.vehicleColor,
        },
        description: formData.description,
        images: formData.images,
      })

      setIsSubmitted(true)
    } catch (error) {
      console.error("Error submitting assessment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="text-center py-8">
        <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold mb-2">Assessment Submitted!</h2>
        <p className="mb-6">
          Thank you for submitting your vehicle assessment. A representative will review your information and contact
          you shortly with an estimate.
        </p>
        <Button onClick={() => window.location.reload()}>Submit Another Assessment</Button>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit}>
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Your Information</h2>

          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" name="name" value={formData.name} onChange={handleChange} required />
          </div>

          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input id="email" name="email" type="email" value={formData.email} onChange={handleChange} required />
          </div>

          <div>
            <Label htmlFor="phone">Phone Number</Label>
            <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleChange} required />
          </div>

          <div className="pt-4">
            <Button type="button" onClick={nextStep} className="w-full">
              Next: Vehicle Details
            </Button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Vehicle Details</h2>

          <div>
            <Label htmlFor="vehicleMake">Make</Label>
            <Input id="vehicleMake" name="vehicleMake" value={formData.vehicleMake} onChange={handleChange} required />
          </div>

          <div>
            <Label htmlFor="vehicleModel">Model</Label>
            <Input
              id="vehicleModel"
              name="vehicleModel"
              value={formData.vehicleModel}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <Label htmlFor="vehicleYear">Year</Label>
            <Input
              id="vehicleYear"
              name="vehicleYear"
              type="number"
              min="1900"
              max={new Date().getFullYear() + 1}
              value={formData.vehicleYear}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <Label htmlFor="vehicleColor">Color</Label>
            <Input
              id="vehicleColor"
              name="vehicleColor"
              value={formData.vehicleColor}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
              Back
            </Button>
            <Button type="button" onClick={nextStep} className="flex-1">
              Next: Service Details
            </Button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Service Details</h2>

          <div>
            <Label htmlFor="description">Describe what service you need or any issues with your vehicle</Label>
            <Textarea
              id="description"
              name="description"
              rows={4}
              value={formData.description}
              onChange={handleChange}
              required
            />
          </div>

          <div>
            <Label className="block mb-2">Upload Vehicle Photos (Optional)</Label>
            <ImageUploader onImagesUploaded={handleImageUpload} maxImages={5} />

            {formData.images.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-2">
                {formData.images.map((url, index) => (
                  <div key={index} className="relative">
                    <img
                      src={url || "/placeholder.svg"}
                      alt={`Vehicle ${index + 1}`}
                      className="rounded-md object-cover h-24 w-full"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
              Back
            </Button>
            <Button type="submit" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Assessment"
              )}
            </Button>
          </div>
        </div>
      )}
    </form>
  )
}
