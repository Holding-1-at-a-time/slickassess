"use client"

import { useState, useEffect } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { useMutation, useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ImageUploader } from "@/components/image-uploader"
import { toast } from "@/components/ui/use-toast"
import { handleError } from "@/lib/error-handling"
import { Loader2, Save, X } from "lucide-react"
import type { Id } from "@/convex/_generated/dataModel"

const formSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z
    .number()
    .min(1900, "Year must be at least 1900")
    .max(new Date().getFullYear() + 1, "Year cannot be in the future"),
  color: z.string().optional(),
  vin: z.string().optional(),
  licensePlate: z.string().optional(),
  mileage: z.number().optional(),
  exteriorCondition: z.string().default("good"),
  interiorCondition: z.string().default("good"),
  notes: z.string().optional(),
  status: z.string().default("active"),
})

type VehicleFormProps = {
  vehicle?: {
    _id: Id<"vehicles">
    clientId: string
    make: string
    model: string
    year: number
    color?: string
    vin?: string
    licensePlate?: string
    mileage?: number
    exteriorCondition?: string
    interiorCondition?: string
    notes?: string
    status: string
    images?: Array<{
      _id: Id<"vehicleImages">
      url: string
      category: string
      position?: string
      isPrimary: boolean
    }>
  }
}

export function VehicleForm({ vehicle }: VehicleFormProps) {
  const { getToken } = useAuth()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [token, setToken] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])

  const createVehicleMutation = useMutation(api.vehicles.createVehicle)
  const updateVehicleMutation = useMutation(api.vehicles.updateVehicle)
  const addVehicleImageMutation = useMutation(api.vehicles.addVehicleImage)

  // Get the client ID from the URL if it exists
  const clientIdFromUrl = searchParams.get("clientId")

  // Fetch the token
  useEffect(() => {
    async function fetchToken() {
      try {
        const newToken = await getToken({ template: "convex" })
        setToken(newToken)
      } catch (error) {
        handleError(error)
      }
    }

    fetchToken()
  }, [getToken])

  // Fetch clients for the dropdown
  const clients = useQuery(
    api.clients.getClients,
    {},
    {
      additionalHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )

  // Initialize form with vehicle data or defaults
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      clientId: vehicle?.clientId || clientIdFromUrl || "",
      make: vehicle?.make || "",
      model: vehicle?.model || "",
      year: vehicle?.year || new Date().getFullYear(),
      color: vehicle?.color || "",
      vin: vehicle?.vin || "",
      licensePlate: vehicle?.licensePlate || "",
      mileage: vehicle?.mileage || 0,
      exteriorCondition: vehicle?.exteriorCondition || "good",
      interiorCondition: vehicle?.interiorCondition || "good",
      notes: vehicle?.notes || "",
      status: vehicle?.status || "active",
    },
  })

  // Initialize uploaded images from vehicle data
  useEffect(() => {
    if (vehicle?.images) {
      setUploadedImages(vehicle.images.map((image) => image.url))
    }
  }, [vehicle])

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsSubmitting(true)

    try {
      const token = await getToken({ template: "convex" })
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined

      if (vehicle) {
        // Update existing vehicle
        await updateVehicleMutation(
          {
            vehicleId: vehicle._id,
            ...values,
          },
          { additionalHeaders: headers },
        )

        toast({
          title: "Success",
          description: "Vehicle updated successfully",
        })
      } else {
        // Create new vehicle
        const vehicleId = await createVehicleMutation(values, { additionalHeaders: headers })

        // Add images if any were uploaded
        for (let i = 0; i < uploadedImages.length; i++) {
          await addVehicleImageMutation(
            {
              vehicleId,
              url: uploadedImages[i],
              category: "exterior",
              position: "front",
              isPrimary: i === 0, // First image is primary
            },
            { additionalHeaders: headers },
          )
        }

        toast({
          title: "Success",
          description: "Vehicle created successfully",
        })

        // Redirect to the new vehicle page
        router.push(`/vehicles/${vehicleId}`)
      }
    } catch (error) {
      handleError(error)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="shadow-neon">
      <CardHeader>
        <CardTitle className="text-[#00ae98] neon-text">{vehicle ? "Edit Vehicle" : "Add New Vehicle"}</CardTitle>
        <CardDescription className="text-secondary">
          {vehicle ? "Update vehicle information" : "Enter vehicle details to create a new vehicle"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="clientId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#00ae98]">
                    Client <span className="text-red-500">*</span>
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className="border-secondary focus:ring-[#00ae98]">
                        <SelectValue placeholder="Select a client" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {clients?.map((client) => (
                        <SelectItem key={client._id} value={client._id}>
                          {client.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <FormField
                control={form.control}
                name="make"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#00ae98]">
                      Make <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="model"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#00ae98]">
                      Model <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#00ae98]">
                      Year <span className="text-red-500">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        onChange={(e) => field.onChange(Number.parseInt(e.target.value))}
                        className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="color"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#00ae98]">Color</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="vin"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#00ae98]">VIN</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="licensePlate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#00ae98]">License Plate</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mileage"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#00ae98]">Mileage</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        type="number"
                        onChange={(e) => field.onChange(Number.parseInt(e.target.value) || 0)}
                        className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="exteriorCondition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#00ae98]">Exterior Condition</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-secondary focus:ring-[#00ae98]">
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="interiorCondition"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#00ae98]">Interior Condition</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-secondary focus:ring-[#00ae98]">
                          <SelectValue placeholder="Select condition" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="excellent">Excellent</SelectItem>
                        <SelectItem value="good">Good</SelectItem>
                        <SelectItem value="fair">Fair</SelectItem>
                        <SelectItem value="poor">Poor</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-[#00ae98]">Notes</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      className="min-h-[100px] border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {vehicle && (
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[#00ae98]">Status</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="border-secondary focus:ring-[#00ae98]">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="sold">Sold</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <div className="space-y-2">
              <FormLabel className="text-[#00ae98]">Vehicle Images</FormLabel>
              <ImageUploader
                onUploadComplete={setUploadedImages}
                initialImages={vehicle?.images?.map((img) => img.url) || []}
              />
            </div>

            <div className="flex justify-end space-x-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="border-secondary text-secondary hover:bg-secondary hover:text-white"
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-[#00ae98] hover:bg-[#00ae98]/90 text-white">
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {vehicle ? "Updating..." : "Creating..."}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {vehicle ? "Update Vehicle" : "Create Vehicle"}
                  </>
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  )
}
