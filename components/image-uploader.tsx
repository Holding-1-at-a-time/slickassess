"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, X, ImageIcon, Loader2 } from "lucide-react"
import { handleError } from "@/lib/error-handling"
import { toast } from "@/components/ui/use-toast"
import { OptimizedImage } from "@/components/optimized-image"
import { compressImage } from "@/lib/image/image-processor"

interface ImageUploaderProps {
  onUploadComplete: (urls: string[]) => void
  maxImages?: number
  maxSizeInMB?: number
  acceptedFormats?: string[]
  autoCompress?: boolean
  compressQuality?: number
  maxWidth?: number
}

export function ImageUploader({
  onUploadComplete,
  maxImages = 5,
  maxSizeInMB = 10,
  acceptedFormats = ["image/jpeg", "image/png", "image/webp", "image/heic"],
  autoCompress = true,
  compressQuality = 0.8,
  maxWidth = 1920,
}: ImageUploaderProps) {
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({})
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
    const newProgressState: Record<string, number> = {}
    const newUrls: string[] = []

    try {
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const fileId = `${file.name}-${Date.now()}`
        newProgressState[fileId] = 0
        setUploadProgress((prev) => ({ ...prev, [fileId]: 0 }))

        // Check file size
        if (file.size > maxSizeInMB * 1024 * 1024) {
          if (!autoCompress) {
            toast({
              title: "File too large",
              description: `${file.name} exceeds the maximum size of ${maxSizeInMB}MB.`,
              variant: "destructive",
            })
            continue
          }

          // Auto-compress large images
          try {
            const compressedFile = await compressImage(file, {
              maxWidth,
              quality: compressQuality,
              maxSizeInMB,
            })

            // Replace the original file with the compressed one
            Object.defineProperty(file, "size", {
              value: compressedFile.size,
              writable: false,
            })

            // Create a new object URL for the compressed file
            const objectUrl = URL.createObjectURL(compressedFile)
            newUrls.push(objectUrl)

            // Update progress
            setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }))

            toast({
              title: "Image compressed",
              description: `${file.name} was compressed from ${(file.size / (1024 * 1024)).toFixed(2)}MB to ${(compressedFile.size / (1024 * 1024)).toFixed(2)}MB.`,
            })
          } catch (error) {
            console.error("Error compressing image:", error)
            toast({
              title: "Compression failed",
              description: `Failed to compress ${file.name}. The file may be too large.`,
              variant: "destructive",
            })
            continue
          }
        } else {
          // File is within size limits, create object URL
          const objectUrl = URL.createObjectURL(file)
          newUrls.push(objectUrl)

          // Update progress
          setUploadProgress((prev) => ({ ...prev, [fileId]: 100 }))
        }
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
      setUploadProgress({})
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
              <OptimizedImage src={url} alt={`Uploaded ${index + 1}`} fill className="w-full h-full object-cover" />
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
        accept={acceptedFormats.join(",")}
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
        {maxSizeInMB && ` (Max size: ${maxSizeInMB}MB${autoCompress ? ", auto-compression enabled" : ""})`}
      </p>
    </div>
  )
}
