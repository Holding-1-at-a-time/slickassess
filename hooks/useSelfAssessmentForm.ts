"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import {
  type ClientInfoSchema,
  type VehicleInfoSchema,
  type AssessmentInfoSchema,
  clientInfoSchema,
  vehicleInfoSchema,
  assessmentInfoSchema,
} from "@/lib/validations/self-assessment-schema"
import { ZodError } from "zod"

export function useSelfAssessmentForm(tenantId: Id<"tenants">) {
  const createPublicAssessment = useMutation(api.publicAssessments.create)

  // Form state
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [uploadingImages, setUploadingImages] = useState(false)

  // Form data
  const [clientInfo, setClientInfo] = useState<ClientInfoSchema>({
    name: "",
    email: "",
    phone: "",
  })

  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfoSchema>({
    make: "",
    model: "",
    year: "",
    color: "",
    licensePlate: "",
    mileage: "",
  })

  const [assessmentInfo, setAssessmentInfo] = useState<AssessmentInfoSchema>({
    hasScratches: false,
    hasDents: false,
    hasRust: false,
    hasInteriorDamage: false,
    notes: "",
  })

  const [images, setImages] = useState<string[]>([])

  // Update client info
  const updateClientInfo = (field: keyof ClientInfoSchema, value: string) => {
    setClientInfo((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field when user types
    if (errors[`clientInfo.${field}`]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[`clientInfo.${field}`]
        return newErrors
      })
    }
  }

  // Update vehicle info
  const updateVehicleInfo = (field: keyof VehicleInfoSchema, value: string) => {
    setVehicleInfo((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field when user types
    if (errors[`vehicleInfo.${field}`]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[`vehicleInfo.${field}`]
        return newErrors
      })
    }
  }

  // Update assessment info
  const updateAssessmentInfo = (field: keyof AssessmentInfoSchema, value: boolean | string) => {
    setAssessmentInfo((prev) => ({ ...prev, [field]: value }))
    // Clear error for this field when user types
    if (errors[`assessmentInfo.${field}`]) {
      setErrors((prev) => {
        const newErrors = { ...prev }
        delete newErrors[`assessmentInfo.${field}`]
        return newErrors
      })
    }
  }

  // Handle image upload
  const handleImageUpload = (imageUrls: string[]) => {
    setImages((prev) => [...prev, ...imageUrls])
  }

  // Validate current step
  const validateStep = (stepNumber: number): boolean => {
    try {
      setErrors({})

      switch (stepNumber) {
        case 1:
          clientInfoSchema.parse(clientInfo)
          break
        case 2:
          vehicleInfoSchema.parse(vehicleInfo)
          break
        case 3:
          assessmentInfoSchema.parse(assessmentInfo)
          break
        default:
          return true
      }
      return true
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors: Record<string, string> = {}
        error.errors.forEach((err) => {
          const path = err.path.join(".")
          formattedErrors[path] = err.message
        })
        setErrors(formattedErrors)
      } else {
        console.error("Validation error:", error)
        setErrors({ form: "An unexpected error occurred" })
      }
      return false
    }
  }

  // Navigation
  const nextStep = () => {
    if (validateStep(step)) {
      setStep(step + 1)
    }
  }

  const prevStep = () => {
    setStep(step - 1)
  }

  // Form submission
  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      setErrors({})

      // Validate all steps before submission
      const isClientInfoValid = validateStep(1)
      const isVehicleInfoValid = validateStep(2)
      const isAssessmentInfoValid = validateStep(3)

      if (!isClientInfoValid || !isVehicleInfoValid || !isAssessmentInfoValid) {
        setSubmitting(false)
        return
      }

      // Get client IP or generate a fingerprint for rate limiting
      // In a real app, you'd use a more robust solution
      const clientIdentifier = window.navigator.userAgent || "unknown-client"

      // Create assessment
      await createPublicAssessment({
        tenantId,
        clientInfo,
        vehicleInfo: {
          make: vehicleInfo.make,
          model: vehicleInfo.model,
          year: Number.parseInt(vehicleInfo.year),
          color: vehicleInfo.color || undefined,
          licensePlate: vehicleInfo.licensePlate || undefined,
          mileage: vehicleInfo.mileage ? Number.parseInt(vehicleInfo.mileage) : undefined,
        },
        assessmentInfo,
        imageUrls: images,
        clientIdentifier,
      })

      setSubmitted(true)
    } catch (e) {
      console.error("Error submitting assessment:", e)
      setErrors({ form: "An error occurred while submitting your assessment. Please try again." })
    } finally {
      setSubmitting(false)
    }
  }

  // Reset form
  const resetForm = () => {
    setSubmitted(false)
    setStep(1)
    setClientInfo({
      name: "",
      email: "",
      phone: "",
    })
    setVehicleInfo({
      make: "",
      model: "",
      year: "",
      color: "",
      licensePlate: "",
      mileage: "",
    })
    setAssessmentInfo({
      hasScratches: false,
      hasDents: false,
      hasRust: false,
      hasInteriorDamage: false,
      notes: "",
    })
    setImages([])
    setErrors({})
  }

  // Get field error
  const getFieldError = (field: string): string | undefined => {
    return errors[field]
  }

  return {
    step,
    submitted,
    submitting,
    errors,
    uploadingImages,
    clientInfo,
    vehicleInfo,
    assessmentInfo,
    images,
    updateClientInfo,
    updateVehicleInfo,
    updateAssessmentInfo,
    handleImageUpload,
    setUploadingImages,
    nextStep,
    prevStep,
    handleSubmit,
    resetForm,
    getFieldError,
  }
}
