"use client"

import { useSelfAssessmentForm } from "@/hooks/useSelfAssessmentForm"
import { StepOne } from "./self-assessment/step-one"
import { StepTwo } from "./self-assessment/step-two"
import { StepThree } from "./self-assessment/step-three"
import { StepFour } from "./self-assessment/step-four"
import { SuccessView } from "./self-assessment/success-view"
import { Card, CardContent } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import type { Id } from "@/convex/_generated/dataModel"

interface SelfAssessmentFormProps {
  tenantId: Id<"tenants">
  tenantName?: string
}

export function SelfAssessmentForm({ tenantId, tenantName }: SelfAssessmentFormProps) {
  const {
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
  } = useSelfAssessmentForm(tenantId)

  return (
    <div className="w-full max-w-md mx-auto">
      <Card>
        <CardContent className="pt-6">
          {errors.form && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errors.form}</AlertDescription>
            </Alert>
          )}

          {submitted ? (
            <SuccessView tenantName={tenantName} onReset={resetForm} />
          ) : (
            <>
              {step === 1 && (
                <StepOne
                  clientInfo={clientInfo}
                  updateClientInfo={updateClientInfo}
                  nextStep={nextStep}
                  getFieldError={getFieldError}
                />
              )}

              {step === 2 && (
                <StepTwo
                  vehicleInfo={vehicleInfo}
                  updateVehicleInfo={updateVehicleInfo}
                  nextStep={nextStep}
                  prevStep={prevStep}
                  getFieldError={getFieldError}
                />
              )}

              {step === 3 && (
                <StepThree
                  assessmentInfo={assessmentInfo}
                  updateAssessmentInfo={updateAssessmentInfo}
                  nextStep={nextStep}
                  prevStep={prevStep}
                  getFieldError={getFieldError}
                />
              )}

              {step === 4 && (
                <StepFour
                  images={images}
                  handleImageUpload={handleImageUpload}
                  uploadingImages={uploadingImages}
                  setUploadingImages={setUploadingImages}
                  prevStep={prevStep}
                  handleSubmit={handleSubmit}
                  submitting={submitting}
                  getFieldError={getFieldError}
                />
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
