"use client"

import { useRef, useEffect, useState, useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useToast } from "@/components/ui/use-toast"
import { Pen, RotateCcw, Check, X } from "lucide-react"

interface DigitalSignaturePadProps {
  onSignatureComplete: (signatureData: SignatureData) => void
  onCancel?: () => void
  signerName?: string
  signerEmail?: string
  title?: string
  description?: string
  required?: boolean
  disabled?: boolean
}

export interface SignatureData {
  signature: string // Base64 encoded signature image
  signerName: string
  signerEmail: string
  signerTitle?: string
  signedAt: string
  ipAddress?: string
  userAgent?: string
  signatureHash: string // For integrity verification
}

export function DigitalSignaturePad({
  onSignatureComplete,
  onCancel,
  signerName = "",
  signerEmail = "",
  title = "Digital Signature",
  description = "Please sign below to approve this assessment report",
  required = true,
  disabled = false,
}: DigitalSignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [hasSignature, setHasSignature] = useState(false)
  const [name, setName] = useState(signerName)
  const [email, setEmail] = useState(signerEmail)
  const [signerTitle, setSignerTitle] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { toast } = useToast()

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Set drawing styles
    ctx.strokeStyle = "#000000"
    ctx.lineWidth = 2
    ctx.lineCap = "round"
    ctx.lineJoin = "round"

    // Fill with white background
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
  }, [])

  const getCoordinates = useCallback((event: MouseEvent | TouchEvent) => {
    const canvas = canvasRef.current
    if (!canvas) return { x: 0, y: 0 }

    const rect = canvas.getBoundingClientRect()
    const clientX = "touches" in event ? event.touches[0].clientX : event.clientX
    const clientY = "touches" in event ? event.touches[0].clientY : event.clientY

    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
    }
  }, [])

  const startDrawing = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (disabled) return

      event.preventDefault()
      setIsDrawing(true)

      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (!canvas || !ctx) return

      const { x, y } = getCoordinates(event)
      ctx.beginPath()
      ctx.moveTo(x, y)
    },
    [disabled, getCoordinates],
  )

  const draw = useCallback(
    (event: MouseEvent | TouchEvent) => {
      if (!isDrawing || disabled) return

      event.preventDefault()
      const canvas = canvasRef.current
      const ctx = canvas?.getContext("2d")
      if (!canvas || !ctx) return

      const { x, y } = getCoordinates(event)
      ctx.lineTo(x, y)
      ctx.stroke()

      setHasSignature(true)
    },
    [isDrawing, disabled, getCoordinates],
  )

  const stopDrawing = useCallback(() => {
    setIsDrawing(false)
  }, [])

  // Mouse events
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleMouseDown = (e: MouseEvent) => startDrawing(e)
    const handleMouseMove = (e: MouseEvent) => draw(e)
    const handleMouseUp = () => stopDrawing()

    canvas.addEventListener("mousedown", handleMouseDown)
    canvas.addEventListener("mousemove", handleMouseMove)
    canvas.addEventListener("mouseup", handleMouseUp)
    canvas.addEventListener("mouseleave", handleMouseUp)

    return () => {
      canvas.removeEventListener("mousedown", handleMouseDown)
      canvas.removeEventListener("mousemove", handleMouseMove)
      canvas.removeEventListener("mouseup", handleMouseUp)
      canvas.removeEventListener("mouseleave", handleMouseUp)
    }
  }, [startDrawing, draw, stopDrawing])

  // Touch events
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const handleTouchStart = (e: TouchEvent) => startDrawing(e)
    const handleTouchMove = (e: TouchEvent) => draw(e)
    const handleTouchEnd = () => stopDrawing()

    canvas.addEventListener("touchstart", handleTouchStart)
    canvas.addEventListener("touchmove", handleTouchMove)
    canvas.addEventListener("touchend", handleTouchEnd)

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart)
      canvas.removeEventListener("touchmove", handleTouchMove)
      canvas.removeEventListener("touchend", handleTouchEnd)
    }
  }, [startDrawing, draw, stopDrawing])

  const clearSignature = () => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext("2d")
    if (!canvas || !ctx) return

    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasSignature(false)
  }

  const generateSignatureHash = (signatureData: string, metadata: string): string => {
    // Simple hash function for signature integrity
    // In production, use a proper cryptographic hash
    let hash = 0
    const str = signatureData + metadata
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16)
  }

  const handleSubmit = async () => {
    if (!hasSignature) {
      toast({
        title: "Signature Required",
        description: "Please provide your signature before submitting.",
        variant: "destructive",
      })
      return
    }

    if (!name.trim()) {
      toast({
        title: "Name Required",
        description: "Please enter your full name.",
        variant: "destructive",
      })
      return
    }

    if (!email.trim()) {
      toast({
        title: "Email Required",
        description: "Please enter your email address.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsSubmitting(true)

      const canvas = canvasRef.current
      if (!canvas) throw new Error("Canvas not found")

      // Get signature as base64
      const signatureDataUrl = canvas.toDataURL("image/png")

      // Get user metadata
      const signedAt = new Date().toISOString()
      const userAgent = navigator.userAgent
      const metadata = `${name}|${email}|${signedAt}|${userAgent}`

      // Generate signature hash for integrity
      const signatureHash = generateSignatureHash(signatureDataUrl, metadata)

      const signatureData: SignatureData = {
        signature: signatureDataUrl,
        signerName: name.trim(),
        signerEmail: email.trim(),
        signerTitle: signerTitle.trim() || undefined,
        signedAt,
        userAgent,
        signatureHash,
      }

      await onSignatureComplete(signatureData)

      toast({
        title: "Signature Captured",
        description: "Your digital signature has been successfully recorded.",
      })
    } catch (error) {
      console.error("Error submitting signature:", error)
      toast({
        title: "Signature Failed",
        description: "Failed to capture signature. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Pen className="h-5 w-5" />
          {title}
        </CardTitle>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Signer Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="signerName">Full Name {required && <span className="text-red-500">*</span>}</Label>
            <Input
              id="signerName"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your full name"
              disabled={disabled}
              required={required}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signerEmail">Email Address {required && <span className="text-red-500">*</span>}</Label>
            <Input
              id="signerEmail"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              disabled={disabled}
              required={required}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="signerTitle">Title/Position (Optional)</Label>
          <Input
            id="signerTitle"
            value={signerTitle}
            onChange={(e) => setSignerTitle(e.target.value)}
            placeholder="e.g., Fleet Manager, Owner"
            disabled={disabled}
          />
        </div>

        {/* Signature Canvas */}
        <div className="space-y-2">
          <Label>Digital Signature {required && <span className="text-red-500">*</span>}</Label>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 bg-gray-50">
            <canvas
              ref={canvasRef}
              className="w-full h-40 bg-white border border-gray-200 rounded cursor-crosshair touch-none"
              style={{ touchAction: "none" }}
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-sm text-muted-foreground">
                {hasSignature ? "Signature captured" : "Sign above using your mouse or finger"}
              </p>
              <Button type="button" variant="outline" size="sm" onClick={clearSignature} disabled={disabled}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
          </div>
        </div>

        {/* Legal Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">
            <strong>Legal Notice:</strong> By signing this document electronically, you agree that your electronic
            signature is the legal equivalent of your manual signature and that you are legally bound by the terms of
            this assessment report. This signature will be timestamped and stored securely for record-keeping purposes.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 justify-end">
          {onCancel && (
            <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          )}
          <Button onClick={handleSubmit} disabled={!hasSignature || isSubmitting || disabled}>
            {isSubmitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Processing...
              </>
            ) : (
              <>
                <Check className="h-4 w-4 mr-1" />
                Sign & Approve
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
