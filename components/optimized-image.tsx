"use client"

import Image from "next/image"
import { useState, useEffect } from "react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  sizes?: string
  priority?: boolean
  quality?: number
  fill?: boolean
  className?: string
  fallbackSrc?: string
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down"
  onLoad?: () => void
  onError?: () => void
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  sizes = "(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw",
  priority = false,
  quality = 80,
  fill = false,
  className,
  fallbackSrc = "/placeholder.svg",
  objectFit = "cover",
  onLoad,
  onError,
}: OptimizedImageProps) {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [imgSrc, setImgSrc] = useState(src)

  useEffect(() => {
    // Reset states when src changes
    setLoading(true)
    setError(false)
    setImgSrc(src)
  }, [src])

  const handleLoad = () => {
    setLoading(false)
    onLoad?.()
  }

  const handleError = () => {
    setLoading(false)
    setError(true)
    setImgSrc(fallbackSrc)
    onError?.()
  }

  // Determine if the image is an external URL
  const isExternal = imgSrc.startsWith("http") || imgSrc.startsWith("data:")

  // For Convex storage URLs, we need to use unoptimized
  const isConvexStorage = imgSrc.includes("convex.cloud") || imgSrc.includes("convex.dev")

  return (
    <div className={cn("relative", className)} style={{ position: "relative" }}>
      {loading && (
        <Skeleton className="absolute inset-0 z-10" style={{ width: width || "100%", height: height || "100%" }} />
      )}

      <Image
        src={imgSrc || "/placeholder.svg"}
        alt={alt}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        sizes={sizes}
        priority={priority}
        quality={quality}
        fill={fill}
        className={cn(
          "transition-opacity duration-300",
          loading ? "opacity-0" : "opacity-100",
          objectFit === "contain" && "object-contain",
          objectFit === "cover" && "object-cover",
          objectFit === "fill" && "object-fill",
          objectFit === "none" && "object-none",
          objectFit === "scale-down" && "object-scale-down",
        )}
        onLoad={handleLoad}
        onError={handleError}
        unoptimized={isExternal || isConvexStorage}
      />
    </div>
  )
}
