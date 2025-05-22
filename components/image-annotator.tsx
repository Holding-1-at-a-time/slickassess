"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/components/ui/use-toast"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { v4 as uuidv4 } from "uuid"
import {
  Circle,
  Square,
  MapPin,
  Type,
  ArrowRight,
  Trash2,
  Save,
  Undo,
  Redo,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
} from "lucide-react"

// Define the annotation types
type AnnotationType = "pin" | "rectangle" | "circle" | "arrow" | "text"
type SeverityType = "minor" | "moderate" | "severe"

// Define the annotation object
interface Annotation {
  id: string
  type: AnnotationType
  x: number
  y: number
  width?: number
  height?: number
  radius?: number
  color: string
  text?: string
  severity?: SeverityType
  category?: string
}

// Define the component props
interface ImageAnnotatorProps {
  imageUrl: string
  imageId: Id<"images">
  vehicleId: Id<"vehicles">
  assessmentId?: Id<"assessments">
  readOnly?: boolean
  onSave?: (annotations: Annotation[]) => void
}

export function ImageAnnotator({
  imageUrl,
  imageId,
  vehicleId,
  assessmentId,
  readOnly = false,
  onSave,
}: ImageAnnotatorProps) {
  // Refs for canvas elements
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)

  // State for annotations and editing
  const [annotations, setAnnotations] = useState<Annotation[]>([])
  const [selectedTool, setSelectedTool] = useState<AnnotationType>("pin")
  const [selectedColor, setSelectedColor] = useState<string>("#ff0000")
  const [selectedSeverity, setSelectedSeverity] = useState<SeverityType>("minor")
  const [selectedCategory, setSelectedCategory] = useState<string>("scratch")
  const [isDrawing, setIsDrawing] = useState(false)
  const [currentAnnotation, setCurrentAnnotation] = useState<Partial<Annotation> | null>(null)
  const [selectedAnnotation, setSelectedAnnotation] = useState<string | null>(null)
  const [scale, setScale] = useState(1)
  const [isSaving, setIsSaving] = useState(false)
  const [noteText, setNoteText] = useState("")

  // History for undo/redo
  const [history, setHistory] = useState<Annotation[][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)

  // Convex mutations
  const saveAnnotationsMutation = useMutation(api.annotations.saveAnnotations)

  // Load the image when the component mounts
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.src = imageUrl
    img.onload = () => {
      imageRef.current = img
      drawCanvas()
    }
  }, [imageUrl])

  // Load existing annotations from the database
  useEffect(() => {
    const fetchAnnotations = async () => {
      try {
        // In a real implementation, you would fetch annotations from Convex here
        // For now, we'll just use an empty array
        setAnnotations([])
        addToHistory([])
      } catch (error) {
        console.error("Error fetching annotations:", error)
        toast({
          title: "Error",
          description: "Failed to load annotations",
          variant: "destructive",
        })
      }
    }

    fetchAnnotations()
  }, [imageId])

  // Draw the canvas whenever annotations or scale changes
  useEffect(() => {
    drawCanvas()
  }, [annotations, scale, selectedAnnotation])

  // Add current state to history
  const addToHistory = (newAnnotations: Annotation[]) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push([...newAnnotations])
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  // Undo the last action
  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setAnnotations([...history[historyIndex - 1]])
    }
  }

  // Redo the last undone action
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setAnnotations([...history[historyIndex + 1]])
    }
  }

  // Draw the canvas with the image and annotations
  const drawCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx || !imageRef.current) return

    // Get the container dimensions
    const container = containerRef.current
    if (!container) return

    // Set canvas dimensions to match the container
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight

    // Clear the canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Calculate the scaled dimensions
    const imgWidth = imageRef.current.width * scale
    const imgHeight = imageRef.current.height * scale

    // Center the image in the canvas
    const x = (canvas.width - imgWidth) / 2
    const y = (canvas.height - imgHeight) / 2

    // Draw the image
    ctx.drawImage(imageRef.current, x, y, imgWidth, imgHeight)

    // Draw the annotations
    annotations.forEach((annotation) => {
      const isSelected = annotation.id === selectedAnnotation

      // Set the drawing style based on the annotation type and selection state
      ctx.strokeStyle = annotation.color
      ctx.fillStyle = annotation.color + "40" // Add transparency
      ctx.lineWidth = isSelected ? 3 : 2

      // Calculate the scaled position
      const scaledX = x + annotation.x * scale
      const scaledY = y + annotation.y * scale

      // Draw the annotation based on its type
      switch (annotation.type) {
        case "pin":
          // Draw a pin marker
          ctx.beginPath()
          ctx.arc(scaledX, scaledY, 10 * scale, 0, 2 * Math.PI)
          ctx.fill()
          ctx.stroke()
          break

        case "rectangle":
          if (annotation.width && annotation.height) {
            // Draw a rectangle
            ctx.beginPath()
            ctx.rect(scaledX, scaledY, annotation.width * scale, annotation.height * scale)
            ctx.fill()
            ctx.stroke()
          }
          break

        case "circle":
          if (annotation.radius) {
            // Draw a circle
            ctx.beginPath()
            ctx.arc(scaledX, scaledY, annotation.radius * scale, 0, 2 * Math.PI)
            ctx.fill()
            ctx.stroke()
          }
          break

        case "arrow":
          if (annotation.width && annotation.height) {
            // Draw an arrow line
            const endX = scaledX + annotation.width * scale
            const endY = scaledY + annotation.height * scale

            // Draw the line
            ctx.beginPath()
            ctx.moveTo(scaledX, scaledY)
            ctx.lineTo(endX, endY)
            ctx.stroke()

            // Draw the arrowhead
            const angle = Math.atan2(endY - scaledY, endX - scaledX)
            const headLength = 15 * scale

            ctx.beginPath()
            ctx.moveTo(endX, endY)
            ctx.lineTo(
              endX - headLength * Math.cos(angle - Math.PI / 6),
              endY - headLength * Math.sin(angle - Math.PI / 6),
            )
            ctx.lineTo(
              endX - headLength * Math.cos(angle + Math.PI / 6),
              endY - headLength * Math.sin(angle + Math.PI / 6),
            )
            ctx.closePath()
            ctx.fill()
          }
          break

        case "text":
          if (annotation.text) {
            // Draw text
            ctx.font = `${16 * scale}px sans-serif`
            ctx.fillStyle = annotation.color
            ctx.fillText(annotation.text, scaledX, scaledY)

            // Draw a background for the text if selected
            if (isSelected) {
              const metrics = ctx.measureText(annotation.text)
              const textHeight = 16 * scale
              ctx.strokeStyle = "#ffffff"
              ctx.strokeRect(scaledX - 2, scaledY - textHeight + 2, metrics.width + 4, textHeight + 4)
            }
          }
          break
      }

      // Draw the severity and category if available
      if (annotation.severity || annotation.category) {
        ctx.font = `${12 * scale}px sans-serif`
        ctx.fillStyle = "#000000"

        let labelY = scaledY

        // Adjust position based on annotation type
        if (annotation.type === "pin") {
          labelY += 20 * scale
        } else if (annotation.type === "circle" && annotation.radius) {
          labelY += annotation.radius * scale + 15
        } else if (annotation.type === "rectangle" && annotation.height) {
          labelY += annotation.height * scale + 15
        }

        // Draw the severity and category
        if (annotation.severity) {
          ctx.fillText(`Severity: ${annotation.severity}`, scaledX, labelY)
          labelY += 15 * scale
        }

        if (annotation.category) {
          ctx.fillText(`Type: ${annotation.category}`, scaledX, labelY)
        }
      }
    })

    // Draw the current annotation if drawing
    if (isDrawing && currentAnnotation) {
      ctx.strokeStyle = selectedColor
      ctx.fillStyle = selectedColor + "40" // Add transparency
      ctx.lineWidth = 2

      const scaledX = x + (currentAnnotation.x || 0) * scale
      const scaledY = y + (currentAnnotation.y || 0) * scale

      switch (selectedTool) {
        case "pin":
          ctx.beginPath()
          ctx.arc(scaledX, scaledY, 10 * scale, 0, 2 * Math.PI)
          ctx.fill()
          ctx.stroke()
          break

        case "rectangle":
          if (currentAnnotation.width && currentAnnotation.height) {
            ctx.beginPath()
            ctx.rect(scaledX, scaledY, currentAnnotation.width * scale, currentAnnotation.height * scale)
            ctx.fill()
            ctx.stroke()
          }
          break

        case "circle":
          if (currentAnnotation.radius) {
            ctx.beginPath()
            ctx.arc(scaledX, scaledY, currentAnnotation.radius * scale, 0, 2 * Math.PI)
            ctx.fill()
            ctx.stroke()
          }
          break

        case "arrow":
          if (currentAnnotation.width && currentAnnotation.height) {
            const endX = scaledX + (currentAnnotation.width || 0) * scale
            const endY = scaledY + (currentAnnotation.height || 0) * scale

            ctx.beginPath()
            ctx.moveTo(scaledX, scaledY)
            ctx.lineTo(endX, endY)
            ctx.stroke()

            const angle = Math.atan2(endY - scaledY, endX - scaledX)
            const headLength = 15 * scale

            ctx.beginPath()
            ctx.moveTo(endX, endY)
            ctx.lineTo(
              endX - headLength * Math.cos(angle - Math.PI / 6),
              endY - headLength * Math.sin(angle - Math.PI / 6),
            )
            ctx.lineTo(
              endX - headLength * Math.cos(angle + Math.PI / 6),
              endY - headLength * Math.sin(angle + Math.PI / 6),
            )
            ctx.closePath()
            ctx.fill()
          }
          break
      }
    }
  }

  // Convert canvas coordinates to image coordinates
  const canvasToImageCoords = (canvasX: number, canvasY: number) => {
    const canvas = canvasRef.current
    if (!canvas || !imageRef.current) return { x: 0, y: 0 }

    const imgWidth = imageRef.current.width * scale
    const imgHeight = imageRef.current.height * scale
    const x = (canvas.width - imgWidth) / 2
    const y = (canvas.height - imgHeight) / 2

    // Convert canvas coordinates to image coordinates
    const imageX = (canvasX - x) / scale
    const imageY = (canvasY - y) / scale

    return { x: imageX, y: imageY }
  }

  // Handle mouse down event
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly) return

    const canvas = canvasRef.current
    if (!canvas) return

    // Get the mouse position relative to the canvas
    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Convert to image coordinates
    const { x, y } = canvasToImageCoords(mouseX, mouseY)

    // Check if we clicked on an existing annotation
    const clickedAnnotation = annotations.find((annotation) => {
      switch (annotation.type) {
        case "pin":
          const distance = Math.sqrt(Math.pow((annotation.x - x) * scale, 2) + Math.pow((annotation.y - y) * scale, 2))
          return distance <= 10 * scale

        case "rectangle":
          if (annotation.width && annotation.height) {
            return (
              x >= annotation.x &&
              x <= annotation.x + annotation.width &&
              y >= annotation.y &&
              y <= annotation.y + annotation.height
            )
          }
          return false

        case "circle":
          if (annotation.radius) {
            const distance = Math.sqrt(
              Math.pow((annotation.x - x) * scale, 2) + Math.pow((annotation.y - y) * scale, 2),
            )
            return distance <= annotation.radius * scale
          }
          return false

        case "text":
          // Simple check for text (could be improved)
          return x >= annotation.x - 5 && x <= annotation.x + 100 && y >= annotation.y - 20 && y <= annotation.y + 5

        case "arrow":
          // Simple check for arrow (could be improved)
          if (annotation.width && annotation.height) {
            const endX = annotation.x + annotation.width
            const endY = annotation.y + annotation.height
            const distance = distanceToLine(x, y, annotation.x, annotation.y, endX, endY)
            return distance <= 5
          }
          return false

        default:
          return false
      }
    })

    if (clickedAnnotation) {
      // Select the clicked annotation
      setSelectedAnnotation(clickedAnnotation.id)
      return
    }

    // Deselect any selected annotation
    setSelectedAnnotation(null)

    // Start drawing a new annotation
    setIsDrawing(true)

    // Create a new annotation based on the selected tool
    switch (selectedTool) {
      case "pin":
        setCurrentAnnotation({
          id: uuidv4(),
          type: "pin",
          x,
          y,
          color: selectedColor,
          severity: selectedSeverity,
          category: selectedCategory,
        })
        break

      case "rectangle":
        setCurrentAnnotation({
          id: uuidv4(),
          type: "rectangle",
          x,
          y,
          width: 0,
          height: 0,
          color: selectedColor,
          severity: selectedSeverity,
          category: selectedCategory,
        })
        break

      case "circle":
        setCurrentAnnotation({
          id: uuidv4(),
          type: "circle",
          x,
          y,
          radius: 0,
          color: selectedColor,
          severity: selectedSeverity,
          category: selectedCategory,
        })
        break

      case "arrow":
        setCurrentAnnotation({
          id: uuidv4(),
          type: "arrow",
          x,
          y,
          width: 0,
          height: 0,
          color: selectedColor,
          severity: selectedSeverity,
          category: selectedCategory,
        })
        break

      case "text":
        // For text, we'll add it immediately
        const newTextAnnotation: Annotation = {
          id: uuidv4(),
          type: "text",
          x,
          y,
          color: selectedColor,
          text: noteText || "Add text",
          severity: selectedSeverity,
          category: selectedCategory,
        }

        const newAnnotations = [...annotations, newTextAnnotation]
        setAnnotations(newAnnotations)
        addToHistory(newAnnotations)
        setCurrentAnnotation(null)
        setIsDrawing(false)
        break
    }
  }

  // Handle mouse move event
  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (readOnly || !isDrawing || !currentAnnotation) return

    const canvas = canvasRef.current
    if (!canvas) return

    // Get the mouse position relative to the canvas
    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    // Convert to image coordinates
    const { x, y } = canvasToImageCoords(mouseX, mouseY)

    // Update the current annotation based on the selected tool
    switch (selectedTool) {
      case "pin":
        // For pins, we just update the position
        setCurrentAnnotation({
          ...currentAnnotation,
          x,
          y,
        })
        break

      case "rectangle":
        // For rectangles, we update the width and height
        setCurrentAnnotation({
          ...currentAnnotation,
          width: x - (currentAnnotation.x || 0),
          height: y - (currentAnnotation.y || 0),
        })
        break

      case "circle":
        // For circles, we update the radius
        const dx = x - (currentAnnotation.x || 0)
        const dy = y - (currentAnnotation.y || 0)
        const radius = Math.sqrt(dx * dx + dy * dy)
        setCurrentAnnotation({
          ...currentAnnotation,
          radius,
        })
        break

      case "arrow":
        // For arrows, we update the end point
        setCurrentAnnotation({
          ...currentAnnotation,
          width: x - (currentAnnotation.x || 0),
          height: y - (currentAnnotation.y || 0),
        })
        break
    }
  }

  // Handle mouse up event
  const handleMouseUp = () => {
    if (readOnly || !isDrawing || !currentAnnotation) return

    // Add the current annotation to the list
    if (currentAnnotation.type !== "text") {
      const newAnnotation = currentAnnotation as Annotation
      const newAnnotations = [...annotations, newAnnotation]
      setAnnotations(newAnnotations)
      addToHistory(newAnnotations)
    }

    // Reset the current annotation and drawing state
    setCurrentAnnotation(null)
    setIsDrawing(false)
  }

  // Handle deleting the selected annotation
  const handleDeleteAnnotation = () => {
    if (!selectedAnnotation) return

    const newAnnotations = annotations.filter((annotation) => annotation.id !== selectedAnnotation)
    setAnnotations(newAnnotations)
    addToHistory(newAnnotations)
    setSelectedAnnotation(null)
  }

  // Handle saving the annotations
  const handleSaveAnnotations = async () => {
    setIsSaving(true)
    try {
      await saveAnnotationsMutation({
        imageId,
        vehicleId,
        assessmentId,
        annotations,
      })

      toast({
        title: "Success",
        description: "Annotations saved successfully",
      })

      if (onSave) {
        onSave(annotations)
      }
    } catch (error) {
      console.error("Error saving annotations:", error)
      toast({
        title: "Error",
        description: "Failed to save annotations",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Calculate the distance from a point to a line segment
  const distanceToLine = (x: number, y: number, x1: number, y1: number, x2: number, y2: number) => {
    const A = x - x1
    const B = y - y1
    const C = x2 - x1
    const D = y2 - y1

    const dot = A * C + B * D
    const lenSq = C * C + D * D
    let param = -1

    if (lenSq !== 0) {
      param = dot / lenSq
    }

    let xx, yy

    if (param < 0) {
      xx = x1
      yy = y1
    } else if (param > 1) {
      xx = x2
      yy = y2
    } else {
      xx = x1 + param * C
      yy = y1 + param * D
    }

    const dx = x - xx
    const dy = y - yy
    return Math.sqrt(dx * dx + dy * dy)
  }

  // Zoom in
  const handleZoomIn = () => {
    setScale(Math.min(scale + 0.1, 3))
  }

  // Zoom out
  const handleZoomOut = () => {
    setScale(Math.max(scale - 0.1, 0.5))
  }

  // Reset zoom
  const handleResetZoom = () => {
    setScale(1)
  }

  return (
    <div className="flex flex-col space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {!readOnly && (
          <>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={selectedTool === "pin" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setSelectedTool("pin")}
                  >
                    <MapPin className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Pin Marker</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={selectedTool === "rectangle" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setSelectedTool("rectangle")}
                  >
                    <Square className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Rectangle</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={selectedTool === "circle" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setSelectedTool("circle")}
                  >
                    <Circle className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Circle</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={selectedTool === "arrow" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setSelectedTool("arrow")}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Arrow</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={selectedTool === "text" ? "default" : "outline"}
                    size="icon"
                    onClick={() => setSelectedTool("text")}
                  >
                    <Type className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Text</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="h-6 border-l border-gray-300 mx-1"></div>

            <div className="flex items-center space-x-2">
              <Label htmlFor="color-picker" className="sr-only">
                Color
              </Label>
              <input
                id="color-picker"
                type="color"
                value={selectedColor}
                onChange={(e) => setSelectedColor(e.target.value)}
                className="w-8 h-8 rounded cursor-pointer"
              />
            </div>

            {selectedTool === "text" && (
              <div className="flex items-center space-x-2">
                <Label htmlFor="note-text" className="sr-only">
                  Text
                </Label>
                <Input
                  id="note-text"
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Enter text"
                  className="w-40"
                />
              </div>
            )}

            <div className="h-6 border-l border-gray-300 mx-1"></div>

            <div className="flex items-center space-x-2">
              <Label htmlFor="severity-select" className="sr-only">
                Severity
              </Label>
              <Select value={selectedSeverity} onValueChange={(value) => setSelectedSeverity(value as SeverityType)}>
                <SelectTrigger id="severity-select" className="w-32">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Minor</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="severe">Severe</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center space-x-2">
              <Label htmlFor="category-select" className="sr-only">
                Category
              </Label>
              <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                <SelectTrigger id="category-select" className="w-32">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scratch">Scratch</SelectItem>
                  <SelectItem value="dent">Dent</SelectItem>
                  <SelectItem value="rust">Rust</SelectItem>
                  <SelectItem value="crack">Crack</SelectItem>
                  <SelectItem value="missing">Missing Part</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </>
        )}

        <div className="h-6 border-l border-gray-300 mx-1"></div>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleZoomIn}>
                <ZoomIn className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom In</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleZoomOut}>
                <ZoomOut className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Zoom Out</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="icon" onClick={handleResetZoom}>
                <RotateCcw className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Reset Zoom</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {!readOnly && (
          <>
            <div className="h-6 border-l border-gray-300 mx-1"></div>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleUndo} disabled={historyIndex <= 0}>
                    <Undo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                  >
                    <Redo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redo</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={handleDeleteAnnotation} disabled={!selectedAnnotation}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete Selected</TooltipContent>
              </Tooltip>
            </TooltipProvider>

            <div className="ml-auto">
              <Button onClick={handleSaveAnnotations} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save Annotations
                  </>
                )}
              </Button>
            </div>
          </>
        )}
      </div>

      <div
        ref={containerRef}
        className="relative border rounded-md overflow-hidden bg-neutral-100 dark:bg-neutral-900"
        style={{ height: "500px" }}
      >
        <canvas
          ref={canvasRef}
          className="absolute top-0 left-0 w-full h-full cursor-crosshair"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        />
      </div>

      {annotations.length > 0 && (
        <div className="mt-4">
          <h3 className="text-lg font-medium mb-2">Annotations ({annotations.length})</h3>
          <div className="border rounded-md p-4 max-h-60 overflow-y-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b">
                  <th className="pb-2">Type</th>
                  <th className="pb-2">Severity</th>
                  <th className="pb-2">Category</th>
                  <th className="pb-2">Notes</th>
                </tr>
              </thead>
              <tbody>
                {annotations.map((annotation) => (
                  <tr
                    key={annotation.id}
                    className={`border-b last:border-0 hover:bg-neutral-100 dark:hover:bg-neutral-800 cursor-pointer ${
                      selectedAnnotation === annotation.id ? "bg-neutral-200 dark:bg-neutral-700" : ""
                    }`}
                    onClick={() => setSelectedAnnotation(annotation.id)}
                  >
                    <td className="py-2">
                      <div className="flex items-center">
                        <div className="w-4 h-4 rounded-full mr-2" style={{ backgroundColor: annotation.color }}></div>
                        {annotation.type.charAt(0).toUpperCase() + annotation.type.slice(1)}
                      </div>
                    </td>
                    <td className="py-2">{annotation.severity || "—"}</td>
                    <td className="py-2">{annotation.category || "—"}</td>
                    <td className="py-2">{annotation.text || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
