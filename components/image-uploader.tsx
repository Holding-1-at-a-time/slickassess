"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, ImageIcon, Loader2 } from "lucide-react"
import { handleError } from "@/lib/error-handling"
import { toast } from "@/components/ui/use-toast"

interface ImageUploaderProps {
  onUploadComplete: (urls: string[]) => void
  maxImages?: number
}

export function ImageUploader({ onUploadComplete, maxImages = 5 }: ImageUploaderProps) {
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files || files.length === 0) return

    // Check if adding these files would exceed the maximum
    if (uploadedImages.length + files.length > maxImages) {
      toast({
        title: "Too many images",
        description: `You can only upload a maximum of ${maxImages} images.`,
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)

    try {
      const newUrls: string[] = []

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i]

        // In a real app, you would upload to a storage service
        // For this example, we'll create object URLs
        const objectUrl = URL.createObjectURL(file)
        newUrls.push(objectUrl)

        // Simulate upload delay
        await new Promise((resolve) => setTimeout(resolve, 500))
      }

      // Update state with new images
      const updatedImages = [...uploadedImages, ...newUrls]
      setUploadedImages(updatedImages)
      onUploadComplete(updatedImages)

      // Reset the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ""
      }
    } catch (error) {
      handleError(error)
    } finally {
      setIsUploading(false)
    }
  }

  const removeImage = (index: number) => {
    const updatedImages = uploadedImages.filter((_, i) => i !== index)
    setUploadedImages(updatedImages)
    onUploadComplete(updatedImages)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        {uploadedImages.map((url, index) => (
          <Card key={index} className="relative w-24 h-24 overflow-hidden">
            <CardContent className="p-0">
              <img
                src={url || "/placeholder.svg"}
                alt={`Uploaded ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => removeImage(index)}
                className="absolute top-1 right-1 bg-black bg-opacity-50 rounded-full p-1 text-white hover:bg-opacity-70"
              >
                <X className="h-4 w-4" />
              </button>
            </CardContent>
          </Card>
        ))}

        {uploadedImages.length < maxImages && (
          <Card
            className={`w-24 h-24 flex items-center justify-center border-dashed cursor-pointer hover:border-[#00ae98] transition-colors ${
              isUploading ? "opacity-50" : ""
            }`}
            onClick={() => !isUploading && fileInputRef.current?.click()}
          >
            <CardContent className="p-0 flex flex-col items-center justify-center h-full">
              {isUploading ? (
                <Loader2 className="h-6 w-6 text-[#00ae98] animate-spin" />
              ) : (
                <>
                  <Upload className="h-6 w-6 text-[#00ae98] mb-1" />
                  <span className="text-xs text-center">Upload</span>
                </>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        multiple
        className="hidden"
        disabled={isUploading || uploadedImages.length >= maxImages}
      />

      <Button
        type="button"
        variant="outline"
        size="sm"
        className="border-[#00ae98] text-[#00ae98] hover:bg-[#00ae98]/10"
        onClick={() => !isUploading && fileInputRef.current?.click()}
        disabled={isUploading || uploadedImages.length >= maxImages}
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Uploading...
          </>
        ) : (
          <>
            <ImageIcon className="mr-2 h-4 w-4" />
            {uploadedImages.length === 0 ? "Upload Images" : "Add More Images"}
          </>
        )}
      </Button>
      <p className="text-xs text-secondary mt-1">
        {uploadedImages.length} of {maxImages} images uploaded
      </p>
    </div>
  )
}
