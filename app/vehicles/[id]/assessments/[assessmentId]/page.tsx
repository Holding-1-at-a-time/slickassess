"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { withAuth } from "@/components/with-auth"
import { CassetteLoader } from "@/components/cassette-loader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { toast } from "sonner"
import { ArrowLeft, Car, Calendar, Gauge, FileText, User, CheckCircle, AlertTriangle, Wrench } from "lucide-react"

function AssessmentDetailPage() {
  const router = useRouter()
  const { id: vehicleId, assessmentId } = useParams() as { id: string; assessmentId: string }

  const assessment = useQuery(api.assessments.getById, { id: assessmentId })
  const completeAssessment = useMutation(api.assessments.complete)

  const [isCompleting, setIsCompleting] = useState(false)

  // Handle status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-gray-500"
      case "in_progress":
        return "bg-blue-500"
      case "completed":
        return "bg-green-500"
      case "cancelled":
        return "bg-red-500"
      default:
        return "bg-gray-500"
    }
  }

  async function handleComplete() {
    setIsCompleting(true)
    try {
      await completeAssessment({
        id: assessmentId,
        generateAISummary: true,
      })
      toast.success("Assessment completed successfully")
      // Force a refetch of the assessment data
      router.refresh()
    } catch (error: any) {
      toast.error(error.message || "Failed to complete assessment")
    } finally {
      setIsCompleting(false)
    }
  }

  if (!assessment) {
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
        <h1 className="text-3xl font-bold text-[#00ae98] neon-text">Assessment {assessment.assessmentNumber}</h1>
        <Badge className={`ml-2 ${getStatusColor(assessment.status)}`}>{assessment.status.replace("_", " ")}</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2">
          <Tabs defaultValue="details">
            <TabsList className="mb-4">
              <TabsTrigger value="details">Details</TabsTrigger>
              <TabsTrigger value="sections">Sections</TabsTrigger>
              <TabsTrigger value="issues">Issues</TabsTrigger>
              <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Assessment Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-[#00ae98]" />
                      <span className="font-medium">Date:</span>
                      {new Date(assessment.assessmentDate).toLocaleString()}
                    </div>
                    <div className="flex items-center gap-2">
                      <Gauge className="h-4 w-4 text-[#00ae98]" />
                      <span className="font-medium">Mileage:</span>
                      {assessment.mileage.toLocaleString()}
                    </div>
                  </div>

                  {assessment.notes && (
                    <div className="flex items-start gap-2">
                      <FileText className="h-4 w-4 text-[#00ae98] mt-1" />
                      <div>
                        <span className="font-medium">Notes:</span>
                        <p className="text-gray-600 dark:text-gray-300">{assessment.notes}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {assessment.aiSummary && (
                <Card className="border-[#00ae98]/20 shadow-md">
                  <CardHeader>
                    <CardTitle>AI-Generated Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p>{assessment.aiSummary}</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="sections">
              <Card>
                <CardHeader>
                  <CardTitle>Assessment Sections</CardTitle>
                </CardHeader>
                <CardContent>
                  {assessment.sections.length === 0 ? (
                    <p className="text-gray-500">No sections defined for this assessment</p>
                  ) : (
                    <div className="space-y-4">
                      {assessment.sections.map((section: any) => (
                        <div key={section.id} className="border rounded-md p-4">
                          <h3 className="font-medium text-lg mb-2">{section.name}</h3>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <span className="font-medium">Condition:</span>
                              {section.condition || "Not rated"}
                            </div>
                            {section.notes && (
                              <div>
                                <span className="font-medium">Notes:</span>
                                {section.notes}
                              </div>
                            )}
                          </div>
                          {section.imageIds.length > 0 && (
                            <div className="mt-2">
                              <span className="font-medium">Images:</span>
                              {section.imageIds.length} uploaded
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="issues">
              <Card>
                <CardHeader>
                  <CardTitle>Identified Issues</CardTitle>
                </CardHeader>
                <CardContent>
                  {assessment.identifiedIssues.length === 0 ? (
                    <p className="text-gray-500">No issues identified for this assessment</p>
                  ) : (
                    <div className="space-y-4">
                      {assessment.identifiedIssues.map((issue: any, index: number) => (
                        <div key={index} className="border rounded-md p-4">
                          <div className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-500 mt-1" />
                            <div>
                              <h3 className="font-medium">{issue.section}</h3>
                              <p className="text-gray-600 dark:text-gray-300">{issue.description}</p>
                              <Badge className="mt-1">{issue.severity} severity</Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="recommendations">
              <Card>
                <CardHeader>
                  <CardTitle>Recommended Services</CardTitle>
                </CardHeader>
                <CardContent>
                  {assessment.recommendedServices.length === 0 ? (
                    <p className="text-gray-500">No services recommended for this assessment</p>
                  ) : (
                    <div className="space-y-4">
                      {assessment.recommendedServices.map((service: any, index: number) => (
                        <div key={index} className="border rounded-md p-4">
                          <div className="flex items-start gap-2">
                            <Wrench className="h-4 w-4 text-[#00ae98] mt-1" />
                            <div>
                              <h3 className="font-medium">{service.name}</h3>
                              <p className="text-gray-600 dark:text-gray-300">{service.description}</p>
                              <Badge className="mt-1">{service.priority} priority</Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>

        <div>
          <Card className="shadow-md border-[#00ae98]/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Car className="h-5 w-5 text-[#00ae98]" />
                Vehicle Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {assessment.vehicle ? (
                <>
                  <p className="font-medium">
                    {assessment.vehicle.make} {assessment.vehicle.model} ({assessment.vehicle.year})
                  </p>
                  <p>
                    <span className="text-gray-500">VIN:</span> {assessment.vehicle.vin}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push(`/vehicles/${vehicleId}`)}
                  >
                    View Vehicle Details
                  </Button>
                </>
              ) : (
                <p className="text-gray-500">Vehicle information not available</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-md border-[#00ae98]/20 mt-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5 text-[#00ae98]" />
                Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {assessment.client ? (
                <>
                  <p className="font-medium">{assessment.client.name}</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => router.push(`/clients/${assessment.client.id}`)}
                  >
                    View Client Details
                  </Button>
                </>
              ) : (
                <p className="text-gray-500">Client information not available</p>
              )}
            </CardContent>
          </Card>

          <div className="mt-4 space-y-3">
            {assessment.status !== "completed" && (
              <Button
                className="w-full bg-[#00ae98] hover:bg-[#00ae98]/90"
                onClick={handleComplete}
                disabled={isCompleting}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                {isCompleting ? "Completing..." : "Complete Assessment"}
              </Button>
            )}

            <Button variant="outline" className="w-full" onClick={() => router.push(`/vehicles/${vehicleId}`)}>
              Back to Vehicle
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default withAuth(AssessmentDetailPage, ["admin", "staff", "assessor"])
