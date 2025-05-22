"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useOrganization } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Loader2, ArrowLeft, Car, User, Calendar, FileText, ImageIcon, Check, X } from "lucide-react"
import Image from "next/image"
import { withAuth } from "@/components/with-auth"
import { formatDate, getRelativeTimeString } from "@/utils/date-formatter"
import { useLeadToast } from "@/components/lead-toast"

function LeadDetailsPage() {
  const params = useParams()
  const router = useRouter()
  const { organization } = useOrganization()
  const leadId = params.id as string
  const leadToast = useLeadToast({ router })

  const lead = useQuery(api.leads.getById, {
    leadId,
  })

  const convertLeadMutation = useMutation(api.leads.convertLeadToAssessment)
  const [converting, setConverting] = useState(false)

  async function handleConvert() {
    if (!lead || lead.convertedToAssessment) return

    try {
      setConverting(true)
      const assessmentId = await convertLeadMutation({ leadAssessmentId: lead._id })
      leadToast.showConversionSuccess(assessmentId)
      router.push(`/assessments/${assessmentId}`)
    } catch (error) {
      console.error("Failed to convert lead:", error)
      leadToast.showConversionError(error as Error)
      setConverting(false)
    }
  }

  if (!lead) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#00ae98]" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Button variant="ghost" onClick={() => router.push("/leads")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Leads
          </Button>
          <h1 className="text-2xl font-bold">Lead Details</h1>
          {lead.convertedToAssessment && (
            <Badge className="ml-2 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">Converted</Badge>
          )}
        </div>

        {!lead.convertedToAssessment && (
          <Button onClick={handleConvert} disabled={converting} className="bg-[#00ae98] text-white hover:bg-[#009a86]">
            {converting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Converting...
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" />
                Convert to Assessment
              </>
            )}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Lead Information</CardTitle>
            <CardDescription>
              Submitted on {formatDate(lead.createdAt, true)} ({getRelativeTimeString(lead.createdAt)})
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="customer">
              <TabsList className="mb-4">
                <TabsTrigger value="customer">
                  <User className="h-4 w-4 mr-2" />
                  Customer
                </TabsTrigger>
                <TabsTrigger value="vehicle">
                  <Car className="h-4 w-4 mr-2" />
                  Vehicle
                </TabsTrigger>
                <TabsTrigger value="details">
                  <FileText className="h-4 w-4 mr-2" />
                  Details
                </TabsTrigger>
                <TabsTrigger value="images">
                  <ImageIcon className="h-4 w-4 mr-2" />
                  Images
                </TabsTrigger>
              </TabsList>

              <TabsContent value="customer" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Name</h3>
                    <p className="text-lg">{lead.customerInfo.name}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Email</h3>
                    <p className="text-lg">{lead.customerInfo.email}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Phone</h3>
                    <p className="text-lg">{lead.customerInfo.phone}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="vehicle" className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Make</h3>
                    <p className="text-lg">{lead.vehicleInfo.make}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Model</h3>
                    <p className="text-lg">{lead.vehicleInfo.model}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Year</h3>
                    <p className="text-lg">{lead.vehicleInfo.year}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-500">Color</h3>
                    <p className="text-lg">{lead.vehicleInfo.color}</p>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="details" className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500">Description</h3>
                  <p className="text-lg whitespace-pre-wrap">{lead.description}</p>
                </div>

                <div className="grid grid-cols-3 gap-4 mt-4">
                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${lead.hasScratches ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"}`}
                    >
                      {lead.hasScratches ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </div>
                    <span>Has Scratches</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${lead.hasDents ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-400"}`}
                    >
                      {lead.hasDents ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </div>
                    <span>Has Dents</span>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center ${lead.needsDetailing ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-400"}`}
                    >
                      {lead.needsDetailing ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                    </div>
                    <span>Needs Detailing</span>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="images">
                {lead.imageIds.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p>No images provided</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {lead.imageIds.map((imageId, index) => (
                      <div key={index} className="relative aspect-square rounded-md overflow-hidden border">
                        <Image
                          src={imageId || "/placeholder.svg"}
                          alt={`Vehicle image ${index + 1}`}
                          fill
                          className="object-cover"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {lead.convertedToAssessment ? (
                <Button className="w-full" onClick={() => router.push(`/assessments/${lead.convertedToAssessment}`)}>
                  View Assessment
                </Button>
              ) : (
                <Button
                  className="w-full bg-[#00ae98] text-white hover:bg-[#009a86]"
                  onClick={handleConvert}
                  disabled={converting}
                >
                  {converting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Converting...
                    </>
                  ) : (
                    "Convert to Assessment"
                  )}
                </Button>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => (window.location.href = `mailto:${lead.customerInfo.email}`)}
              >
                Contact Customer
              </Button>

              <Button variant="outline" className="w-full" onClick={() => router.push("/leads")}>
                Back to Leads
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="mr-2 bg-blue-100 text-blue-600 rounded-full p-1">
                    <Calendar className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">Lead Created</p>
                    <p className="text-xs text-gray-500">{formatDate(lead.createdAt, true)}</p>
                  </div>
                </div>

                {lead.convertedToAssessment && (
                  <div className="flex items-start">
                    <div className="mr-2 bg-green-100 text-green-600 rounded-full p-1">
                      <Check className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">Converted to Assessment</p>
                      <p className="text-xs text-gray-500">{formatDate(lead.updatedAt, true)}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default withAuth(LeadDetailsPage)
