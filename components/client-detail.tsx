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
import { Edit, Trash2, Phone, Mail, MapPin, Car, FileText } from "lucide-react"
import Link from "next/link"
import type { Id } from "@/convex/_generated/dataModel"

interface ClientDetailProps {
  id: string
}

export function ClientDetail({ id }: ClientDetailProps) {
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

  // Fetch client using the token
  const client = useQuery(
    api.clients.getClient,
    { clientId: id as Id<"clients"> },
    {
      additionalHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )

  // Fetch client's vehicles
  const vehicles = useQuery(
    api.vehicles.getVehicles,
    { clientId: id },
    {
      additionalHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )

  // Fetch client's assessments
  const assessments = useQuery(
    api.assessments.getAssessments,
    { clientId: id },
    {
      additionalHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )

  if (client === undefined || vehicles === undefined || assessments === undefined) {
    return <CassetteLoader />
  }

  if (!client) {
    return (
      <div className="text-center py-12 bg-[#00ae98]/10 rounded-lg border border-[#00ae98]">
        <h2 className="text-xl font-bold text-[#00ae98]">Client Not Found</h2>
        <p className="text-secondary mt-2">The client you're looking for doesn't exist or you don't have access.</p>
        <Button onClick={() => router.push("/clients")} className="mt-4 bg-[#00ae98] hover:bg-[#00ae98]/90 text-white">
          Back to Clients
        </Button>
      </div>
    )
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#00ae98] neon-text">{client.name}</h1>
        <div className="flex gap-2">
          <Link href={`/clients/${id}/edit`}>
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
            <CardTitle className="text-[#00ae98]">Client Information</CardTitle>
            <CardDescription className="text-secondary">Details about this client</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium">Status</h3>
                <Badge
                  variant={client.status === "active" ? "default" : "secondary"}
                  className={
                    client.status === "active"
                      ? "bg-green-500 hover:bg-green-600"
                      : "bg-secondary hover:bg-secondary/90"
                  }
                >
                  {client.status}
                </Badge>
              </div>

              {client.email && (
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Email</h3>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-secondary" />
                    <span>{client.email}</span>
                  </div>
                </div>
              )}

              {client.phone && (
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Phone</h3>
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-secondary" />
                    <span>{client.phone}</span>
                  </div>
                </div>
              )}

              {client.address && (
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Address</h3>
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-secondary" />
                    <span>
                      {client.address}
                      {client.city && client.state && `, ${client.city}, ${client.state}`}
                      {client.zipCode && ` ${client.zipCode}`}
                    </span>
                  </div>
                </div>
              )}

              {client.notes && (
                <div className="pt-4 border-t border-border">
                  <h3 className="font-medium mb-2">Notes</h3>
                  <p className="text-secondary whitespace-pre-wrap">{client.notes}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-neon">
          <CardHeader>
            <CardTitle className="text-[#00ae98]">Summary</CardTitle>
            <CardDescription className="text-secondary">Client activity overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Car className="h-4 w-4 text-[#00ae98]" />
                  <h3 className="font-medium">Vehicles</h3>
                </div>
                <Badge variant="outline" className="border-[#00ae98] text-[#00ae98]">
                  {vehicles?.length || 0}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#00ae98]" />
                  <h3 className="font-medium">Assessments</h3>
                </div>
                <Badge variant="outline" className="border-[#00ae98] text-[#00ae98]">
                  {assessments?.length || 0}
                </Badge>
              </div>

              <div className="pt-4">
                <Link href={`/vehicles/new?clientId=${id}`}>
                  <Button className="w-full bg-[#00ae98] hover:bg-[#00ae98]/90 text-white">
                    <Car className="mr-2 h-4 w-4" />
                    Add Vehicle
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="vehicles" className="mt-6">
        <TabsList className="mb-6">
          <TabsTrigger value="vehicles" className="data-[state=active]:bg-[#00ae98] data-[state=active]:text-white">
            Vehicles
          </TabsTrigger>
          <TabsTrigger value="assessments" className="data-[state=active]:bg-[#00ae98] data-[state=active]:text-white">
            Assessments
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles">
          <Card className="shadow-neon">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-[#00ae98]">Client Vehicles</CardTitle>
                <Link href={`/vehicles/new?clientId=${id}`}>
                  <Button size="sm" className="bg-[#00ae98] hover:bg-[#00ae98]/90 text-white">
                    Add Vehicle
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {vehicles?.length === 0 ? (
                <div className="text-center py-8 text-secondary">
                  No vehicles found for this client. Add a vehicle to get started.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {vehicles?.map((vehicle) => (
                    <Link key={vehicle._id} href={`/vehicles/${vehicle._id}`}>
                      <Card className="hover:border-[#00ae98] transition-colors cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-medium text-[#00ae98]">
                                {vehicle.make} {vehicle.model}
                              </h3>
                              <p className="text-sm text-secondary">
                                {vehicle.year} • {vehicle.color}
                              </p>
                              {vehicle.licensePlate && (
                                <p className="text-xs text-secondary mt-1">License: {vehicle.licensePlate}</p>
                              )}
                            </div>
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
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="assessments">
          <Card className="shadow-neon">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-[#00ae98]">Client Assessments</CardTitle>
                <Link href={`/assessments/new?clientId=${id}`}>
                  <Button size="sm" className="bg-[#00ae98] hover:bg-[#00ae98]/90 text-white">
                    New Assessment
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent>
              {assessments?.length === 0 ? (
                <div className="text-center py-8 text-secondary">
                  No assessments found for this client. Create an assessment to get started.
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
      </Tabs>
    </>
  )
}
