"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { withAuth } from "@/components/with-auth"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { VehicleImageAssessment } from "@/components/vehicle-image-assessment"
import { CassetteTapeLoader } from "@/components/cassette-loader"
import { ArrowLeft, Edit, FileText, Car, ImageIcon, AlertTriangle } from "lucide-react"

function VehicleDetailPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }
  const [activeTab, setActiveTab] = useState("details")

  // Fetch vehicle details
  const vehicle = useQuery(api.vehicles.getById, { id })

  const [client, setClient] = useState(null)

  useEffect(() => {
    if (vehicle && vehicle.clientId) {
      const fetchClient = async () => {
        const clientData = await api.clients.getById({ id: vehicle.clientId })(useQuery.internal.contextValue)
        setClient(clientData)
      }
      fetchClient()
    } else {
      setClient(null)
    }
  }, [vehicle])

  if (!vehicle) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <CassetteTapeLoader />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 max-w-6xl">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => router.push("/vehicles")} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">
            {vehicle.year} {vehicle.make} {vehicle.model}
          </h1>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => router.push(`/vehicles/${id}/edit`)}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Vehicle
          </Button>
          <Button onClick={() => router.push(`/vehicles/${id}/assessments/new`)}>
            <FileText className="mr-2 h-4 w-4" />
            New Assessment
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">
            <Car className="mr-2 h-4 w-4" />
            Vehicle Details
          </TabsTrigger>
          <TabsTrigger value="images">
            <ImageIcon className="mr-2 h-4 w-4" />
            Images & Annotations
          </TabsTrigger>
          <TabsTrigger value="assessments">
            <FileText className="mr-2 h-4 w-4" />
            Assessments
          </TabsTrigger>
          <TabsTrigger value="issues">
            <AlertTriangle className="mr-2 h-4 w-4" />
            Identified Issues
          </TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Vehicle Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium">Make:</div>
                  <div>{vehicle.make}</div>
                  <div className="text-sm font-medium">Model:</div>
                  <div>{vehicle.model}</div>
                  <div className="text-sm font-medium">Year:</div>
                  <div>{vehicle.year}</div>
                  <div className="text-sm font-medium">Color:</div>
                  <div>{vehicle.color || "—"}</div>
                  <div className="text-sm font-medium">VIN:</div>
                  <div>{vehicle.vin}</div>
                  <div className="text-sm font-medium">License Plate:</div>
                  <div>{vehicle.licensePlate || "—"}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Condition</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium">Mileage:</div>
                  <div>{vehicle.mileage ? `${vehicle.mileage.toLocaleString()} mi` : "—"}</div>
                  <div className="text-sm font-medium">Exterior:</div>
                  <div className="capitalize">{vehicle.exteriorCondition || "—"}</div>
                  <div className="text-sm font-medium">Interior:</div>
                  <div className="capitalize">{vehicle.interiorCondition || "—"}</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Client Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-sm font-medium">Name:</div>
                  <div>{client ? client.name : "—"}</div>
                  <div className="text-sm font-medium">Email:</div>
                  <div>{client ? client.email || "—" : "—"}</div>
                  <div className="text-sm font-medium">Phone:</div>
                  <div>{client ? client.phone || "—" : "—"}</div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full mt-2"
                  onClick={() => client && router.push(`/clients/${client._id}`)}
                >
                  View Client
                </Button>
              </CardContent>
            </Card>
          </div>

          {vehicle.notes && (
            <Card>
              <CardHeader>
                <CardTitle>Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-line">{vehicle.notes}</p>
              </CardContent>
            </Card>
          )}

          {vehicle.features && vehicle.features.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Features</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {vehicle.features.map((feature, index) => (
                    <div key={index} className="px-3 py-1 bg-neutral-100 dark:bg-neutral-800 rounded-full text-sm">
                      {feature.replace("_", " ")}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="images">
          <VehicleImageAssessment vehicleId={id} />
        </TabsContent>

        <TabsContent value="assessments">
          {/* Assessment list would go here */}
          <Card>
            <CardHeader>
              <CardTitle>Assessment History</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center py-8 text-neutral-500">Assessment history will be displayed here</p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="issues">
          {/* Issues list would go here */}
          <Card>
            <CardHeader>
              <CardTitle>Identified Issues</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-center py-8 text-neutral-500">
                Identified issues from assessments will be displayed here
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default withAuth(VehicleDetailPage, ["admin", "staff", "assessor"])
