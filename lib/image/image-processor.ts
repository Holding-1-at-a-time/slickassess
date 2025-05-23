interface CompressOptions {
  maxWidth?: number
  maxHeight?: number
  quality?: number
  maxSizeInMB?: number
  format?: "jpeg" | "png" | "webp"
}

/**
 * Compresses an image file to reduce its size
 * @param file The image file to compress
 * @param options Compression options
 * @returns A Promise that resolves to the compressed file
 */
export async function compressImage(file: File, options: CompressOptions = {}): Promise<File> {
  const { maxWidth = 1920, maxHeight = 1080, quality = 0.8, maxSizeInMB = 2, format = "jpeg" } = options

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string

      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let width = img.width
        let height = img.height

        if (width > maxWidth) {
          height = (height * maxWidth) / width
          width = maxWidth
        }

        if (height > maxHeight) {
          width = (width * maxHeight) / height
          height = maxHeight
        }

        // Create canvas and context
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height)

        // Convert to desired format
        let mimeType: string
        switch (format) {
          case "png":
            mimeType = "image/png"
            break
          case "webp":
            mimeType = "image/webp"
            break
          case "jpeg":
          default:
            mimeType = "image/jpeg"
            break
        }

        // Get compressed image data
        let compressedDataUrl = canvas.toDataURL(mimeType, quality)

        // Check if the compressed image is still too large
        let currentQuality = quality
        let iterations = 0
        const maxIterations = 5

        const checkSize = () => {
          // Convert base64 to blob to check size
          const byteString = atob(compressedDataUrl.split(",")[1])
          const mimeString = compressedDataUrl.split(",")[0].split(":")[1].split(";")[0]
          const ab = new ArrayBuffer(byteString.length)
          const ia = new Uint8Array(ab)

          for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i)
          }

          const blob = new Blob([ab], { type: mimeString })
          const currentSizeInMB = blob.size / (1024 * 1024)

          if (currentSizeInMB > maxSizeInMB && iterations < maxIterations) {
            // Reduce quality and try again
            iterations++
            currentQuality = Math.max(0.1, currentQuality - 0.1)
            compressedDataUrl = canvas.toDataURL(mimeType, currentQuality)
            checkSize()
          } else {
            // Convert to file
            const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, `.${format}`), { type: mimeType })

            resolve(compressedFile)
          }
        }

        checkSize()
      }

      img.onerror = () => {
        reject(new Error("Failed to load image"))
      }
    }

    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }
  })
}

/**
 * Generates a thumbnail from an image file
 * @param file The image file to generate a thumbnail from
 * @param maxSize The maximum width/height of the thumbnail
 * @returns A Promise that resolves to the thumbnail as a data URL
 */
export async function generateThumbnail(file: File, maxSize = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)

    reader.onload = (event) => {
      const img = new Image()
      img.src = event.target?.result as string

      img.onload = () => {
        // Calculate dimensions while maintaining aspect ratio
        let width = img.width
        let height = img.height

        if (width > height) {
          if (width > maxSize) {
            height = (height * maxSize) / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width = (width * maxSize) / height
            height = maxSize
          }
        }

        // Create canvas and context
        const canvas = document.createElement("canvas")
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          reject(new Error("Could not get canvas context"))
          return
        }

        // Draw image on canvas
        ctx.drawImage(img, 0, 0, width, height)

        // Get thumbnail data URL
        const thumbnailDataUrl = canvas.toDataURL("image/jpeg", 0.7)
        resolve(thumbnailDataUrl)
      }

      img.onerror = () => {
        reject(new Error("Failed to load image"))
      }
    }

    reader.onerror = () => {
      reject(new Error("Failed to read file"))
    }
  })
}

/**
 * Extracts EXIF data from an image file
 * @param file The image file to extract EXIF data from
 * @returns A Promise that resolves to an object containing EXIF data
 */
export async function extractExifData(file: File): Promise<Record<string, any>> {
  // This is a simplified implementation
  // For a real implementation, you would use a library like exif-js
  return new Promise((resolve) => {
    // Return a basic object with file metadata
    resolve({
      name: file.name,
      type: file.type,
      size: file.size,
      lastModified: new Date(file.lastModified).toISOString(),
    })
  })
}
