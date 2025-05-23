"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { ImageAnnotator } from "@/components/image-annotator"
import { ImageUploader } from "@/components/image-uploader"
import { AIVehicleAnalyzer } from "@/components/ai-vehicle-analyzer"
import { useToast } from "@/components/ui/use-toast"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Plus } from "lucide-react"

interface VehicleImageAssessmentProps {
  vehicleId: Id<"vehicles">
  assessmentId?: Id<"assessments">
  readOnly?: boolean
}

export function VehicleImageAssessment({ vehicleId, assessmentId, readOnly = false }: VehicleImageAssessmentProps) {
  const [selectedImageId, setSelectedImageId] = useState<Id<"vehicleImages"> | null>(null)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [activeTab, setActiveTab] = useState("exterior")
  const [refreshKey, setRefreshKey] = useState(0)
  const [analysisTab, setAnalysisTab] = useState<"annotations" | "ai-analysis">("annotations")

  const toast = useToast()

  // Fetch vehicle images from Convex
  const vehicleImages = useQuery(api.images.getVehicleImages, { vehicleId }) || []

  // Group images by category
  const imagesByCategory = vehicleImages.reduce((acc: Record<string, typeof vehicleImages>, image) => {
    const category = image.category || "other"
    if (!acc[category]) {
      acc[category] = []
    }
    acc[category].push(image)
    return acc
  }, {})

  // Get the selected image
  const selectedImage = selectedImageId ? vehicleImages.find((image) => image._id === selectedImageId) : null

  // Handle image upload
  const handleUploadComplete = async (urls: string[]) => {
    setUploadedImages(urls)
    setIsUploading(true)

    try {
      // Upload each image to the server
      for (const imageUrl of urls) {
        const response = await fetch("/api/images/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            imageUrl,
            vehicleId,
            assessmentId,
            category: activeTab,
            position: "front", // Default position
            tags: ["assessment"],
          }),
        })

        if (!response.ok) {
          throw new Error("Failed to upload image")
        }
      }

      toast({
        title: "Success",
        description: "Images uploaded successfully",
      })

      // Clear the uploaded images
      setUploadedImages([])

      // Refresh the image list
      setRefreshKey((prev) => prev + 1)
    } catch (error) {
      console.error("Error uploading images:", error)
      toast({
        title: "Error",
        description: "Failed to upload images",
        variant: "destructive",
      })
    } finally {
      setIsUploading(false)
    }
  }

  // Handle AI analysis complete
  const handleAnalysisComplete = () => {
    // Refresh the annotations
    setRefreshKey((prev) => prev + 1)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Vehicle Images</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="exterior" onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="exterior">Exterior</TabsTrigger>
            <TabsTrigger value="interior">Interior</TabsTrigger>
            <TabsTrigger value="damage">Damage</TabsTrigger>
            <TabsTrigger value="other">Other</TabsTrigger>
          </TabsList>

          {Object.entries(imagesByCategory).map(([category, images]) => (
            <TabsContent key={category} value={category} className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map((image) => (
                  <Card
                    key={image._id}
                    className={`cursor-pointer overflow-hidden ${
                      selectedImageId === image._id ? "ring-2 ring-[#00ae98]" : ""
                    }`}
                    onClick={() => setSelectedImageId(image._id)}
                  >
                    <div className="aspect-square relative">
                      <img
                        src={image.imageUrl || "/placeholder.svg"}
                        alt={`Vehicle ${category} image`}
                        className="object-cover w-full h-full"
                      />
                    </div>
                  </Card>
                ))}

                {!readOnly && (
                  <Card
                    className="cursor-pointer border-dashed flex items-center justify-center aspect-square"
                    onClick={() => document.getElementById("upload-button")?.click()}
                  >
                    <div className="text-center p-4">
                      <Plus className="h-8 w-8 mx-auto mb-2 text-[#00ae98]" />
                      <p className="text-sm">Add Image</p>
                    </div>
                  </Card>
                )}
              </div>

              {!readOnly && (
                <div className="mt-4">
                  <ImageUploader onUploadComplete={handleUploadComplete} maxImages={5} />
                </div>
              )}

              {selectedImage && (
                <div className="mt-6">
                  <Tabs
                    value={analysisTab}
                    onValueChange={(value) => setAnalysisTab(value as "annotations" | "ai-analysis")}
                  >
                    <TabsList className="mb-4">
                      <TabsTrigger value="annotations">Manual Annotations</TabsTrigger>
                      <TabsTrigger value="ai-analysis">AI Analysis</TabsTrigger>
                    </TabsList>

                    <TabsContent value="annotations">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="md:col-span-2">
                          <h3 className="text-lg font-medium mb-4">Image Annotations</h3>
                          <ImageAnnotator
                            key={`annotator-${refreshKey}`}
                            imageUrl={selectedImage.imageUrl}
                            imageId={selectedImage._id}
                            vehicleId={vehicleId}
                            assessmentId={assessmentId}
                            readOnly={readOnly}
                          />
                        </div>
                      </div>
                    </TabsContent>

                    <TabsContent value="ai-analysis">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <div className="aspect-video relative mb-4 border rounded-md overflow-hidden">
                            <img
                              src={selectedImage.imageUrl || "/placeholder.svg"}
                              alt="Selected vehicle image"
                              className="object-contain w-full h-full"
                            />
                          </div>
                        </div>
                        <div>
                          <AIVehicleAnalyzer
                            imageUrl={selectedImage.imageUrl}
                            imageId={selectedImage._id}
                            vehicleId={vehicleId}
                            assessmentId={assessmentId}
                            onAnalysisComplete={handleAnalysisComplete}
                          />
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              {!selectedImage && images.length > 0 && (
                <div className="mt-6 text-center p-8 border rounded-md bg-neutral-50 dark:bg-neutral-900">
                  <p className="text-neutral-500">Select an image to view or add annotations</p>
                </div>
              )}

              {images.length === 0 && (
                <div className="mt-6 text-center p-8 border rounded-md bg-neutral-50 dark:bg-neutral-900">
                  <p className="text-neutral-500">No {category} images available</p>
                  {!readOnly && (
                    <Button
                      variant="outline"
                      className="mt-4"
                      onClick={() => document.getElementById("upload-button")?.click()}
                    >
                      Upload Images
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  )
}
