"use client"

import { useState } from "react"
import { OptimizedImage } from "@/components/optimized-image"
import { Dialog, DialogContent } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, X, ZoomIn } from "lucide-react"
import { cn } from "@/lib/utils"

interface ImageItem {
  id: string
  src: string
  alt: string
  category?: string
  width?: number
  height?: number
}

interface ResponsiveImageGalleryProps {
  images: ImageItem[]
  className?: string
  aspectRatio?: "square" | "video" | "auto"
  columns?: 1 | 2 | 3 | 4 | 5
  gap?: "none" | "sm" | "md" | "lg"
  lightbox?: boolean
  onImageClick?: (image: ImageItem) => void
}

export function ResponsiveImageGallery({
  images,
  className,
  aspectRatio = "square",
  columns = 3,
  gap = "md",
  lightbox = true,
  onImageClick,
}: ResponsiveImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [open, setOpen] = useState(false)

  const handleImageClick = (index: number, image: ImageItem) => {
    if (lightbox) {
      setCurrentIndex(index)
      setOpen(true)
    }

    if (onImageClick) {
      onImageClick(image)
    }
  }

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  // Calculate aspect ratio class
  const aspectRatioClass = aspectRatio === "square" ? "aspect-square" : aspectRatio === "video" ? "aspect-video" : ""

  // Calculate gap class
  const gapClass = gap === "none" ? "gap-0" : gap === "sm" ? "gap-2" : gap === "lg" ? "gap-6" : "gap-4"

  // Calculate columns class
  const columnsClass =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
        ? "grid-cols-1 sm:grid-cols-2"
        : columns === 4
          ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4"
          : columns === 5
            ? "grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5"
            : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"

  return (
    <>
      <div className={cn("grid", columnsClass, gapClass, className)}>
        {images.map((image, index) => (
          <div
            key={image.id}
            className={cn("group relative overflow-hidden rounded-md border cursor-pointer", aspectRatioClass)}
            onClick={() => handleImageClick(index, image)}
          >
            <OptimizedImage
              src={image.src}
              alt={image.alt}
              fill
              className="transition-transform duration-300 group-hover:scale-105"
              objectFit="cover"
            />

            {lightbox && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                <ZoomIn className="h-8 w-8 text-white" />
              </div>
            )}
          </div>
        ))}
      </div>

      {lightbox && images.length > 0 && (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="max-w-4xl p-0 bg-black/90">
            <div className="relative h-[80vh] w-full">
              <OptimizedImage
                src={images[currentIndex].src}
                alt={images[currentIndex].alt}
                fill
                objectFit="contain"
                className="p-4"
              />

              <Button
                variant="ghost"
                size="icon"
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                onClick={(e) => {
                  e.stopPropagation()
                  prevImage()
                }}
              >
                <ChevronLeft className="h-8 w-8" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                onClick={(e) => {
                  e.stopPropagation()
                  nextImage()
                }}
              >
                <ChevronRight className="h-8 w-8" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                className="absolute right-2 top-2 bg-black/50 text-white hover:bg-black/70"
                onClick={() => setOpen(false)}
              >
                <X className="h-6 w-6" />
              </Button>

              <div className="absolute bottom-4 left-0 right-0 text-center text-white">{images[currentIndex].alt}</div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
