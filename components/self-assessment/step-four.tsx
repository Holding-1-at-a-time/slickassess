"use client"

import { Button } from "@/components/ui/button"
import { ImageUploader } from "@/components/image-uploader"
import { Loader2 } from "lucide-react"

interface StepFourProps {
  images: string[]
  handleImageUpload: (imageUrls: string[]) => void
  setUploadingImages: (uploading: boolean) => void
  handleSubmit: () => void
  submitting: boolean
  uploadingImages: boolean
  prevStep: () => void
}

export function StepFour({
  images,
  handleImageUpload,
  setUploadingImages,
  handleSubmit,
  submitting,
  uploadingImages,
  prevStep,
}: StepFourProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Upload Photos</h2>
      <p className="text-sm text-gray-600 mb-4">
        Please upload photos of your vehicle to help us better assess its condition. Include photos of any damage you
        mentioned.
      </p>

      <ImageUploader
        onImagesUploaded={handleImageUpload}
        onUploadingChange={setUploadingImages}
        maxImages={5}
        publicUpload={true}
      />

      {images.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium mb-2">{images.length} photo(s) uploaded</p>
          <div className="grid grid-cols-3 gap-2">
            {images.map((url, index) => (
              <div key={index} className="relative aspect-square rounded overflow-hidden">
                <img
                  src={url || "/placeholder.svg"}
                  alt={`Vehicle photo ${index + 1}`}
                  className="object-cover w-full h-full"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between pt-6 gap-4">
        <Button variant="outline" onClick={prevStep} className="flex-1">
          Back
        </Button>
        <Button onClick={handleSubmit} disabled={submitting || uploadingImages} className="flex-1">
          {submitting ? (
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
  )
}
