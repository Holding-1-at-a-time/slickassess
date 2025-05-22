"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ImageUploader } from "@/components/image-uploader"
import { Loader2, CheckCircle2 } from "lucide-react"
import type { Id } from "@/convex/_generated/dataModel"

// Generate years for dropdown
const currentYear = new Date().getFullYear()
const years = Array.from({ length: 30 }, (_, i) => currentYear - i)

// Vehicle makes for dropdown
const vehicleMakes = [
  "Acura",
  "Alfa Romeo",
  "Aston Martin",
  "Audi",
  "Bentley",
  "BMW",
  "Buick",
  "Cadillac",
  "Chevrolet",
  "Chrysler",
  "Dodge",
  "Ferrari",
  "Fiat",
  "Ford",
  "Genesis",
  "GMC",
  "Honda",
  "Hyundai",
  "Infiniti",
  "Jaguar",
  "Jeep",
  "Kia",
  "Lamborghini",
  "Land Rover",
  "Lexus",
  "Lincoln",
  "Maserati",
  "Mazda",
  "McLaren",
  "Mercedes-Benz",
  "Mini",
  "Mitsubishi",
  "Nissan",
  "Porsche",
  "Ram",
  "Rolls-Royce",
  "Subaru",
  "Tesla",
  "Toyota",
  "Volkswagen",
  "Volvo",
]

interface SelfAssessmentFormProps {
  tenantId: Id<"tenants">
}

export function SelfAssessmentForm({ tenantId }: SelfAssessmentFormProps) {
  const router = useRouter()
  const createPublicAssessment = useMutation(api.publicAssessments.create)

  // Form state
  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Client info
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")

  // Vehicle info
  const [make, setMake] = useState("")
  const [model, setModel] = useState("")
  const [year, setYear] = useState("")
  const [color, setColor] = useState("")
  const [licensePlate, setLicensePlate] = useState("")
  const [mileage, setMileage] = useState("")

  // Assessment info
  const [hasScratches, setHasScratches] = useState(false)
  const [hasDents, setHasDents] = useState(false)
  const [hasRust, setHasRust] = useState(false)
  const [hasInteriorDamage, setHasInteriorDamage] = useState(false)
  const [notes, setNotes] = useState("")

  // Images
  const [images, setImages] = useState<string[]>([])
  const [uploadingImages, setUploadingImages] = useState(false)

  const handleImageUpload = (imageUrls: string[]) => {
    setImages((prev) => [...prev, ...imageUrls])
  }

  const handleSubmit = async () => {
    try {
      setSubmitting(true)
      setError(null)

      // Validate required fields
      if (!name || !email || !make || !model || !year) {
        setError("Please fill in all required fields")
        setSubmitting(false)
        return
      }

      // Create assessment
      await createPublicAssessment({
        tenantId,
        clientInfo: {
          name,
          email,
          phone,
        },
        vehicleInfo: {
          make,
          model,
          year: Number.parseInt(year),
          color,
          licensePlate,
          mileage: mileage ? Number.parseInt(mileage) : undefined,
        },
        assessmentInfo: {
          hasScratches,
          hasDents,
          hasRust,
          hasInteriorDamage,
          notes,
        },
        imageUrls: images,
      })

      setSubmitted(true)
    } catch (e) {
      console.error("Error submitting assessment:", e)
      setError("An error occurred while submitting your assessment. Please try again.")
    } finally {
      setSubmitting(false)
    }
  }

  const nextStep = () => {
    // Validate current step
    if (step === 1 && (!name || !email)) {
      setError("Please provide your name and email")
      return
    }

    if (step === 2 && (!make || !model || !year)) {
      setError("Please provide vehicle make, model, and year")
      return
    }

    setError(null)
    setStep(step + 1)
  }

  const prevStep = () => {
    setError(null)
    setStep(step - 1)
  }

  if (submitted) {
    return (
      <Card className="w-full">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Assessment Submitted!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for submitting your vehicle assessment. A representative will review your information and
              contact you soon.
            </p>
            <Button
              onClick={() => {
                setSubmitted(false)
                setStep(1)
                // Reset form
                setName("")
                setEmail("")
                setPhone("")
                setMake("")
                setModel("")
                setYear("")
                setColor("")
                setLicensePlate("")
                setMileage("")
                setHasScratches(false)
                setHasDents(false)
                setHasRust(false)
                setHasInteriorDamage(false)
                setNotes("")
                setImages([])
              }}
            >
              Submit Another Assessment
            </Button>
          </div>
        </CardContent>
      </Card>
    )
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
      {step === 1 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Contact Information</h2>

          <div className="space-y-2">
            <Label htmlFor="name">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">
              Email Address <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <Input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
          </div>

          <div className="pt-4">
            <Button onClick={nextStep} className="w-full">
              Next: Vehicle Details
            </Button>
          </div>
        </div>
      )}

      {/* Step 2: Vehicle Information */}
      {step === 2 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Vehicle Information</h2>

          <div className="space-y-2">
            <Label htmlFor="make">
              Make <span className="text-red-500">*</span>
            </Label>
            <Select value={make} onValueChange={setMake}>
              <SelectTrigger>
                <SelectValue placeholder="Select make" />
              </SelectTrigger>
              <SelectContent>
                {vehicleMakes.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="model">
              Model <span className="text-red-500">*</span>
            </Label>
            <Input
              id="model"
              value={model}
              onChange={(e) => setModel(e.target.value)}
              placeholder="Civic, Accord, etc."
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="year">
              Year <span className="text-red-500">*</span>
            </Label>
            <Select value={year} onValueChange={setYear}>
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((y) => (
                  <SelectItem key={y} value={y.toString()}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="color">Color</Label>
            <Input
              id="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              placeholder="Red, Blue, Silver, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="licensePlate">License Plate</Label>
            <Input
              id="licensePlate"
              value={licensePlate}
              onChange={(e) => setLicensePlate(e.target.value)}
              placeholder="ABC123"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="mileage">Mileage</Label>
            <Input
              id="mileage"
              type="number"
              value={mileage}
              onChange={(e) => setMileage(e.target.value)}
              placeholder="50000"
            />
          </div>

          <div className="flex justify-between pt-4 gap-4">
            <Button variant="outline" onClick={prevStep} className="flex-1">
              Back
            </Button>
            <Button onClick={nextStep} className="flex-1">
              Next: Condition
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Condition Assessment */}
      {step === 3 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Vehicle Condition</h2>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="scratches"
                checked={hasScratches}
                onCheckedChange={(checked) => setHasScratches(checked === true)}
              />
              <Label htmlFor="scratches">Vehicle has visible scratches or paint damage</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="dents" checked={hasDents} onCheckedChange={(checked) => setHasDents(checked === true)} />
              <Label htmlFor="dents">Vehicle has dents or body damage</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox id="rust" checked={hasRust} onCheckedChange={(checked) => setHasRust(checked === true)} />
              <Label htmlFor="rust">Vehicle has rust or corrosion</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="interior"
                checked={hasInteriorDamage}
                onCheckedChange={(checked) => setHasInteriorDamage(checked === true)}
              />
              <Label htmlFor="interior">Vehicle has interior damage</Label>
            </div>
          </div>

          <div className="space-y-2 pt-4">
            <Label htmlFor="notes">Additional Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Please describe any issues or concerns about your vehicle..."
              rows={4}
            />
          </div>

          <div className="flex justify-between pt-4 gap-4">
            <Button variant="outline" onClick={prevStep} className="flex-1">
              Back
            </Button>
            <Button onClick={nextStep} className="flex-1">
              Next: Upload Photos
            </Button>
          </div>
        </div>
      )}

      {/* Step 4: Photo Upload */}
      {step === 4 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold mb-4">Upload Photos</h2>
          <p className="text-sm text-gray-600 mb-4">
            Please upload photos of your vehicle to help us better assess its condition. Include photos of any damage
            you mentioned.
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
      )}
    </div>
  )
}
