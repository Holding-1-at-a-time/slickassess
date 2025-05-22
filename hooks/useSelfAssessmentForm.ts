"use client"

import { useState } from "react"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"

export type ClientInfo = {
  name: string
  email: string
  phone: string
}

export type VehicleInfo = {
  make: string
  model: string
  year: string
  color: string
  licensePlate: string
  mileage: string
}

export type AssessmentInfo = {
  hasScratches: boolean
  hasDents: boolean
  hasRust: boolean
  hasInteriorDamage: boolean
  notes: string
}

export function useSelfAssessmentForm(tenantId: Id<"tenants">) {
  const createPublicAssessment = useMutation(api.publicAssessments.create)

  // Form state
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [uploadingImages, setUploadingImages] = useState(false)

  // Form data
  const [clientInfo, setClientInfo] = useState<ClientInfo>({
    name: "",
    email: "",
    phone: "",
  })

  const [vehicleInfo, setVehicleInfo] = useState<VehicleInfo>({
    make: "",
    model: "",
    year: "",
    color: "",
    licensePlate: "",
    mileage: "",
  })

  const [assessmentInfo, setAssessmentInfo] = useState<AssessmentInfo>({
    hasScratches: false,
    hasDents: false,
    hasRust: false,
    hasInteriorDamage: false,
    notes: "",
  })

  const [images, setImages] = useState<string[]>([])

  // Update client info
  const updateClientInfo = (field: keyof ClientInfo, value: string) => {
    setClientInfo((prev) => ({ ...prev, [field]: value }))
  }

  // Update vehicle info
  const updateVehicleInfo = (field: keyof VehicleInfo, value: string) => {
    setVehicleInfo((prev) => ({ ...prev, [field]: value }))
  }

  // Update assessment info
  const updateAssessmentInfo = (field: keyof AssessmentInfo, value: boolean | string) => {
    setAssessmentInfo((prev) => ({ ...prev, [field]: value }))
  }

  // Handle image upload
  const handleImageUpload = (imageUrls: string[]) => {
    setImages((prev) => [...prev, ...imageUrls])
  }

  // Navigation
  const nextStep = () => {
    // Validate current step
    if (step === 1) {
      if (!clientInfo.name || !clientInfo.email) {
        setError("Please provide your name and email")
        return
      }
    } else if (step === 2) {
      if (!vehicleInfo.make || !vehicleInfo.model || !vehicleInfo.year) {
        setError("Please provide vehicle make, model, and year")
        return
      }
    }

    setError(null)
    setStep(step + 1)
  }

  const prevStep = () => {
    setError(null)
    setStep(step - 1)
  }

  // Form submission
  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      setError(null)

      // Validate required fields
      if (!clientInfo.name || !clientInfo.email || !vehicleInfo.make || !vehicleInfo.model || !vehicleInfo.year) {
        setError("Please fill in all required fields")
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
      setError("An error occurred while submitting your assessment. Please try again.")
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
    setError(null)
  }

  return {
    step,
    submitted,
    submitting,
    error,
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
    setError,
  }
}
