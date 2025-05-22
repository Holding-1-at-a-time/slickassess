"use client"

import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CassetteLoader } from "@/components/cassette-loader"
import { handleError } from "@/lib/error-handling"
import { Edit, Trash2, FileText, Building, Calendar, Gauge, Key, FileCheck } from "lucide-react"
import Link from "next/link"
import type { Id } from "@/convex/_generated/dataModel"

interface VehicleDetailProps {
  id: string
}

export function VehicleDetail({ id }: VehicleDetailProps) {
  const { getToken } = useAuth()
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()

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

  // Fetch vehicle using the token
  const vehicle = useQuery(
    api.vehicles.getVehicle,
    { vehicleId: id as Id<"vehicles"> },
    {
      additionalHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )

  // Fetch vehicle's assessments
  const assessments = useQuery(
    api.assessments.getAssessments,
    { vehicleId: id as Id<"vehicles"> },
    {
      additionalHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )

  if (vehicle === undefined || assessments === undefined) {
    return <CassetteLoader />
  }

  if (!vehicle) {
    return (
      <div className="text-center py-12 bg-[#00ae98]/10 rounded-lg border border-[#00ae98]">
        <h2 className="text-xl font-bold text-[#00ae98]">Vehicle Not Found</h2>
        <p className="text-secondary mt-2">The vehicle you're looking for doesn't exist or you don't have access.</p>
        <Button onClick={() => router.push("/vehicles")} className="mt-4 bg-[#00ae98] hover:bg-[#00ae98]/90 text-white">
          Back to Vehicles
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#00ae98] neon-text">
          {vehicle.make} {vehicle.model} ({vehicle.year})
        </h1>
        <div className="flex gap-2">
          <Link href={`/vehicles/${id}/edit`}>
            <Button variant="outline" className="border-[#00ae98] text-[#00ae98] hover:bg-[#00ae98]/10">
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </Button>
          </Link>
          <Button variant="outline" className="border-red-500 text-red-500 hover:bg-red-500/10">
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="shadow-neon md:col-span-2">
          <CardHeader>
            <CardTitle className="text-[#00ae98]">Vehicle Information</CardTitle>
            <CardDescription className="text-secondary">Details about this vehicle</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Status</h3>
                  <Badge
                    variant={vehicle.status === "active" ? "default" : "secondary"}
                    className={
                      vehicle.status === "active"
                        ? "bg-green-500 hover:bg-green-600"
                        : "bg-secondary hover:bg-secondary/90"
                    }
                  >
                    {vehicle.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Client</h3>
                  <Link href={`/clients/${vehicle.clientId}`} className="hover:text-[#00ae98] transition-colors">
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-secondary" />
                      <span>{vehicle.clientName}</span>
                    </div>
                  </Link>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Year</h3>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-secondary" />
                    <span>{vehicle.year}</span>
                  </div>
                </div>

                {vehicle.color && (
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Color</h3>
                    <span>{vehicle.color}</span>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {vehicle.vin && (
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">VIN</h3>
                    <span className="font-mono text-sm">{vehicle.vin}</span>
                  </div>
                )}

                {vehicle.licensePlate && (
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">License Plate</h3>
                    <div className="flex items-center gap-2">
                      <Key className="h-4 w-4 text-secondary" />
                      <span>{vehicle.licensePlate}</span>
                    </div>
                  </div>
                )}

                {vehicle.mileage !== undefined && (
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Mileage</h3>
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-secondary" />
                      <span>{vehicle.mileage.toLocaleString()} miles</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Condition</h3>
                  <div>
                    <span>Ext: {vehicle.exteriorCondition || "Good"}</span>
                    <span className="mx-2">|</span>
                    <span>Int: {vehicle.interiorCondition || "Good"}</span>
                  </div>
                </div>
              </div>
            </div>

            {vehicle.notes && (
              <div className="pt-4 mt-4 border-t border-border">
                <h3 className="font-medium mb-2">Notes</h3>
                <p className="text-secondary whitespace-pre-wrap">{vehicle.notes}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-neon">
          <CardHeader>
            <CardTitle className="text-[#00ae98]">Summary</CardTitle>
            <CardDescription className="text-secondary">Vehicle activity overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#00ae98]" />
                  <h3 className="font-medium">Assessments</h3>
                </div>
                <Badge variant="outline" className="border-[#00ae98] text-[#00ae98]">
                  {assessments?.length || 0}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-[#00ae98]" />
                  <h3 className="font-medium">Completed</h3>
                </div>
                <Badge variant="outline" className="border-[#00ae98] text-[#00ae98]">
                  {assessments?.filter((a) => a.status === "completed").length || 0}
                </Badge>
              </div>

              <div className="pt-4">
                <Link href={`/assessments/new?vehicleId=${id}`}>
                  <Button className="w-full bg-[#00ae98] hover:bg-[#00ae98]/90 text-white">
                    <FileText className="mr-2 h-4 w-4" />
                    New Assessment
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Vehicle Images */}
      {vehicle.images && vehicle.images.length > 0 && (
        <Card className="shadow-neon mt-6">
          <CardHeader>
            <CardTitle className="text-[#00ae98]">Vehicle Images</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {vehicle.images.map((image) => (
                <div
                  key={image._id}
                  className={`relative aspect-video rounded-md overflow-hidden border-2 ${
                    image.isPrimary ? "border-[#00ae98]" : "border-transparent"
                  }`}
                >
                  <img
                    src={image.url || "/placeholder.svg"}
                    alt={`${vehicle.make} ${vehicle.model} ${image.category}`}
                    className="w-full h-full object-cover"
                  />
                  {image.isPrimary && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-[#00ae98]">Primary</Badge>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="assessments" className="mt-6">
        <TabsList className="mb-6">
          <TabsTrigger value="assessments" className="data-[state=active]:bg-[#00ae98] data-[state=active]:text-white">
            Assessments
          </TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-[#00ae98] data-[state=active]:text-white">
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="assessments">
          <Card className="shadow-neon">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-[#00ae98]">Vehicle Assessments</CardTitle>
                <Link href={`/assessments/new?vehicleId=${id}`}>
                  <Button size="sm" className="bg-[#00ae98] hover:bg-[#00ae98]/90 text-white">
                    New Assessment
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {assessments?.length === 0 ? (
                <div className="text-center py-8 text-secondary">
                  No assessments found for this vehicle. Create an assessment to get started.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {assessments?.map((assessment) => (
                    <Link key={assessment._id} href={`/assessments/${assessment._id}`}>
                      <Card className="hover:border-[#00ae98] transition-colors cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-[#00ae98]">{assessment.title}</h3>
                              <p className="text-sm text-secondary">
                                {new Date(assessment.createdAt).toLocaleDateString()}
                              </p>
                              {assessment.assignedTo && (
                                <p className="text-xs text-secondary mt-1">Assigned to: {assessment.assignedTo}</p>
                              )}
                            </div>
                            <Badge
                              variant={
                                assessment.status === "completed"
                                  ? "default"
                                  : assessment.status === "in_progress"
                                    ? "outline"
                                    : "secondary"
                              }
                              className={
                                assessment.status === "completed"
                                  ? "bg-green-500 hover:bg-green-600"
                                  : assessment.status === "in_progress"
                                    ? "border-[#00ae98] text-[#00ae98]"
                                    : "bg-amber-500 hover:bg-amber-600"
                              }
                            >
                              {assessment.status}
                            </Badge>
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="shadow-neon">
            <CardHeader>
              <CardTitle className="text-[#00ae98]">Vehicle History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-secondary">
                Vehicle history tracking will be implemented in a future update.
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  )
}
