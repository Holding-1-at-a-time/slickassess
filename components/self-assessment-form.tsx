"use client"
import { useSelfAssessmentForm } from "@/hooks/useSelfAssessmentForm"
import { StepOne } from "./self-assessment/step-one"
import { StepTwo } from "./self-assessment/step-two"
import { StepThree } from "./self-assessment/step-three"
import { StepFour } from "./self-assessment/step-four"
import { SuccessView } from "./self-assessment/success-view"
import type { Id } from "@/convex/_generated/dataModel"

interface SelfAssessmentFormProps {
  tenantId: Id<"tenants">
}

export function SelfAssessmentForm({ tenantId }: SelfAssessmentFormProps) {
  const {
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
  } = useSelfAssessmentForm(tenantId)

  if (submitted) {
    return <SuccessView resetForm={resetForm} />
  }

  return (
    <div className="w-full">
      {/* Progress indicator */}
      <div className="flex justify-between mb-6">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className={`flex-1 h-2 mx-1 rounded-full ${s <= step ? "bg-[#00AE98]" : "bg-gray-200"}`} />
        ))}
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {/* Step 1: Contact Information */}
      {step === 1 && <StepOne clientInfo={clientInfo} updateClientInfo={updateClientInfo} nextStep={nextStep} />}

      {/* Step 2: Vehicle Information */}
      {step === 2 && (
        <StepTwo
          vehicleInfo={vehicleInfo}
          updateVehicleInfo={updateVehicleInfo}
          nextStep={nextStep}
          prevStep={prevStep}
        />
      )}

      {/* Step 3: Condition Assessment */}
      {step === 3 && (
        <StepThree
          assessmentInfo={assessmentInfo}
          updateAssessmentInfo={updateAssessmentInfo}
          nextStep={nextStep}
          prevStep={prevStep}
        />
      )}

      {/* Step 4: Photo Upload */}
      {step === 4 && (
        <StepFour
          images={images}
          handleImageUpload={handleImageUpload}
          setUploadingImages={setUploadingImages}
          handleSubmit={handleSubmit}
          submitting={submitting}
          uploadingImages={uploadingImages}
          prevStep={prevStep}
        />
      )}
    </div>
  )
}
