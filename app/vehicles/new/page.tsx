"use client"

import { useState, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth } from "@clerk/nextjs"
import { ClientDropdown } from "@/components/client-dropdown"
import { ImageUploader } from "@/components/image-uploader"
import { withAuth } from "@/components/with-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Loader2, Save, X } from "lucide-react"
import { toast } from "@/components/ui/use-toast"
import { handleError } from "@/lib/error-handling"
import { Navbar } from "@/components/navbar"

function AddVehiclePage() {
  const router = useRouter()
  const { getToken } = useAuth()
  const [vin, setVin] = useState("")
  const [make, setMake] = useState("")
  const [model, setModel] = useState("")
  const [year, setYear] = useState<number | "">("")
  const [color, setColor] = useState("")
  const [licensePlate, setLicensePlate] = useState("")
  const [mileage, setMileage] = useState<number | "">("")
  const [exteriorCondition, setExteriorCondition] = useState("good")
  const [interiorCondition, setInteriorCondition] = useState("good")
  const [notes, setNotes] = useState("")
  const [features, setFeatures] = useState<string[]>([])
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const createVehicleMutation = useMutation(api.vehicles.create)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!selectedClientId) {
      toast({
        title: "Error",
        description: "Please select a client",
        variant: "destructive",
      })
      return
    }

    if (!make || !model || !year) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    setIsSubmitting(true)

    try {
      // 1) Create Clerk JWT for Convex to extract orgId
      const token = await getToken({ template: "convex" })

      // 2) Call Convex mutation
      const vehicleId = await createVehicleMutation(
        {
          clientId: selectedClientId as any,
          vin,
          make,
          model,
          year: Number(year),
          color,
          licensePlate,
          mileage: Number(mileage) || 0,
          exteriorCondition,
          interiorCondition,
          notes,
          features,
        },
        {
          additionalHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      )

      // 3) Upload images to /api/images/upload (also protected by auth())
      for (const url of uploadedImages) {
        await fetch("/api/images/upload", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            imageUrl: url,
            vehicleId,
            category: "exterior",
            position: "front",
            tags: ["initial"],
          }),
        })
      }

      toast({
        title: "Success",
        description: "Vehicle created successfully",
      })

      router.push(`/vehicles/${vehicleId}`)
    } catch (error) {
      handleError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-10">
        <Card className="shadow-neon">
          <CardHeader>
            <CardTitle className="text-[#00ae98] neon-text">Add New Vehicle</CardTitle>
            <CardDescription className="text-secondary">Enter the details of the new vehicle</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <ClientDropdown onSelect={(id) => setSelectedClientId(id)} required />

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="make" className="text-[#00ae98]">
                    Make <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="make"
                    value={make}
                    onChange={(e) => setMake(e.target.value)}
                    required
                    className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="model" className="text-[#00ae98]">
                    Model <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="model"
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    required
                    className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="year" className="text-[#00ae98]">
                    Year <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="year"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value ? Number(e.target.value) : "")}
                    required
                    min={1900}
                    max={new Date().getFullYear() + 1}
                    className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="color" className="text-[#00ae98]">
                    Color
                  </Label>
                  <Input
                    id="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="vin" className="text-[#00ae98]">
                    VIN
                  </Label>
                  <Input
                    id="vin"
                    value={vin}
                    onChange={(e) => setVin(e.target.value)}
                    className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="licensePlate" className="text-[#00ae98]">
                    License Plate
                  </Label>
                  <Input
                    id="licensePlate"
                    value={licensePlate}
                    onChange={(e) => setLicensePlate(e.target.value)}
                    className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="mileage" className="text-[#00ae98]">
                    Mileage
                  </Label>
                  <Input
                    id="mileage"
                    type="number"
                    value={mileage}
                    onChange={(e) => setMileage(e.target.value ? Number(e.target.value) : "")}
                    min={0}
                    className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="exteriorCondition" className="text-[#00ae98]">
                    Exterior Condition
                  </Label>
                  <Select value={exteriorCondition} onValueChange={setExteriorCondition}>
                    <SelectTrigger className="border-secondary focus:ring-[#00ae98]">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="interiorCondition" className="text-[#00ae98]">
                    Interior Condition
                  </Label>
                  <Select value={interiorCondition} onValueChange={setInteriorCondition}>
                    <SelectTrigger className="border-secondary focus:ring-[#00ae98]">
                      <SelectValue placeholder="Select condition" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="excellent">Excellent</SelectItem>
                      <SelectItem value="good">Good</SelectItem>
                      <SelectItem value="fair">Fair</SelectItem>
                      <SelectItem value="poor">Poor</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="text-[#00ae98]">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="min-h-[100px] border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                />
              </div>

              <div className="space-y-2">
                <Label className="text-[#00ae98]">Features</Label>
                <div className="flex flex-wrap gap-2">
                  {["leather_seats", "sunroof", "navigation", "heated_seats", "bluetooth", "backup_camera"].map(
                    (feature) => (
                      <Button
                        key={feature}
                        type="button"
                        variant={features.includes(feature) ? "default" : "outline"}
                        className={
                          features.includes(feature)
                            ? "bg-[#00ae98] hover:bg-[#00ae98]/90"
                            : "border-secondary text-secondary hover:bg-secondary hover:text-white"
                        }
                        onClick={() => {
                          if (features.includes(feature)) {
                            setFeatures(features.filter((f) => f !== feature))
                          } else {
                            setFeatures([...features, feature])
                          }
                        }}
                      >
                        {feature.split("_").join(" ")}
                      </Button>
                    ),
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[#00ae98]">Upload Images</Label>
                <ImageUploader onUploadComplete={setUploadedImages} />
              </div>

              <div className="pt-4 flex justify-end space-x-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push("/vehicles")}
                  className="border-secondary text-secondary hover:bg-secondary hover:text-white"
                >
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="bg-[#00ae98] hover:bg-[#00ae98]/90 text-white">
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Vehicle
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

export default withAuth(AddVehiclePage, ["admin", "staff", "assessor"])
