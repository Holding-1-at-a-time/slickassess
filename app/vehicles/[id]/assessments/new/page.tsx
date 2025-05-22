"use client"

import { useState, type FormEvent } from "react"
import { useRouter, useParams } from "next/navigation"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { withAuth } from "@/components/with-auth"
import { CassetteLoader } from "@/components/cassette-loader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"
import { ArrowLeft, Car } from "lucide-react"

function NewAssessmentPage() {
  const router = useRouter()
  const { id: vehicleId } = useParams() as { id: string }

  // Fetch vehicle details to display and pre-populate
  const vehicle = useQuery(api.vehicles.getById, { id: vehicleId })
  const createAssessment = useMutation(api.assessments.create)

  const [mileage, setMileage] = useState<number | "">("")
  const [notes, setNotes] = useState("")
  const [assessmentDate, setAssessmentDate] = useState(new Date().toISOString().slice(0, 16))
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Default template sections
  const templateSections = [
    { id: "exterior", name: "Exterior", requiredImages: 4 },
    { id: "interior", name: "Interior", requiredImages: 4 },
    { id: "engine", name: "Engine Bay", requiredImages: 2 },
    { id: "wheels", name: "Wheels & Tires", requiredImages: 4 },
    { id: "undercarriage", name: "Undercarriage", requiredImages: 2 },
  ]

  // Pre-populate mileage from vehicle if available
  useState(() => {
    if (vehicle && vehicle.mileage) {
      setMileage(vehicle.mileage)
    }
  })

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const assessmentId = await createAssessment({
        vehicleId,
        assessmentDate: new Date(assessmentDate).getTime(),
        mileage: Number(mileage),
        notes,
        templateSections,
      })

      toast.success("Assessment created successfully")
      router.push(`/vehicles/${vehicleId}/assessments/${assessmentId}`)
    } catch (error: any) {
      toast.error(error.message || "Failed to create assessment")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!vehicle) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <CassetteLoader />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.push(`/vehicles/${vehicleId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold text-[#00ae98] neon-text">Create Assessment</h1>
      </div>

      <Card className="shadow-md border-[#00ae98]/20 max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Car className="h-5 w-5 text-[#00ae98]" />
            {vehicle.make} {vehicle.model} ({vehicle.year})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Assessment Date</label>
                <Input
                  type="datetime-local"
                  value={assessmentDate}
                  onChange={(e) => setAssessmentDate(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Current Mileage</label>
                <Input
                  type="number"
                  value={mileage}
                  onChange={(e) => setMileage(Number(e.target.value))}
                  placeholder="Enter current mileage"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Initial Notes</label>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter any initial notes about the assessment"
                  rows={4}
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end space-x-3">
              <Button type="button" variant="outline" onClick={() => router.push(`/vehicles/${vehicleId}`)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#00ae98] hover:bg-[#00ae98]/90" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Assessment"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

export default withAuth(NewAssessmentPage, ["admin", "staff", "assessor"])
