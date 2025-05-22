"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CassetteLoader } from "@/components/cassette-loader"
import { handleError } from "@/lib/error-handling"
import { Edit, Trash2, Car, FileText, Building, Calendar, User, CheckCircle, Clock } from "lucide-react"
import Link from "next/link"
import { toast } from "@/components/ui/use-toast"
import type { Id } from "@/convex/_generated/dataModel"

interface AssessmentDetailProps {
  id: string
}

export function AssessmentDetail({ id }: AssessmentDetailProps) {
  const { getToken } = useAuth()
  const { organization } = useOrganization()
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()

  const updateAssessmentMutation = useMutation(api.assessments.updateAssessment)

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

  // Fetch assessment using the token
  const assessment = useQuery(
    api.assessments.getAssessment,
    { assessmentId: id as Id<"assessments"> },
    {
      additionalHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )

  if (assessment === undefined) {
    return <CassetteLoader />
  }

  if (!assessment) {
    return (
      <div className="text-center py-12 bg-[#00ae98]/10 rounded-lg border border-[#00ae98]">
        <h2 className="text-xl font-bold text-[#00ae98]">Assessment Not Found</h2>
        <p className="text-secondary mt-2">The assessment you're looking for doesn't exist or you don't have access.</p>
        <Button
          onClick={() => router.push("/assessments")}
          className="mt-4 bg-[#00ae98] hover:bg-[#00ae98]/90 text-white"
        >
          Back to Assessments
        </Button>
      </div>
    )
  }

  // Find the assigned user's name
  const assignedUser = organization?.memberships?.find(
    (member) => member.publicUserData.userId === assessment.assignedTo,
  )
  const assignedUserName = assignedUser
    ? `${assignedUser.publicUserData.firstName} ${assignedUser.publicUserData.lastName}`
    : "Unassigned"

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>
      case "in_progress":
        return <Badge className="border-[#00ae98] text-[#00ae98] bg-transparent">In Progress</Badge>
      case "pending":
        return <Badge className="bg-amber-500 hover:bg-amber-600">Pending</Badge>
      default:
        return <Badge className="bg-secondary">{status}</Badge>
    }
  }

  const handleMarkAsCompleted = async () => {
    try {
      const token = await getToken({ template: "convex" })
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined

      await updateAssessmentMutation(
        {
          assessmentId: id as Id<"assessments">,
          status: "completed",
          completedAt: Date.now(),
        },
        { additionalHeaders: headers },
      )

      toast({
        title: "Success",
        description: "Assessment marked as completed",
      })

      // Refresh the page
      router.refresh()
    } catch (error) {
      handleError(error)
    }
  }

  return (
    <>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#00ae98] neon-text">{assessment.title}</h1>
        <div className="flex gap-2">
          {assessment.status !== "completed" && (
            <Button
              variant="outline"
              className="border-green-500 text-green-500 hover:bg-green-500/10"
              onClick={handleMarkAsCompleted}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Mark as Completed
            </Button>
          )}
          <Link href={`/assessments/${id}/edit`}>
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
            <CardTitle className="text-[#00ae98]">Assessment Information</CardTitle>
            <CardDescription className="text-secondary">Details about this assessment</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Status</h3>
                  {getStatusBadge(assessment.status)}
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Vehicle</h3>
                  <Link href={`/vehicles/${assessment.vehicleId}`} className="hover:text-[#00ae98] transition-colors">
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4 text-secondary" />
                      <span>{assessment.vehicleName}</span>
                    </div>
                  </Link>
                </div>

                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Client</h3>
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-secondary" />
                    <span>{assessment.clientName}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Assigned To</h3>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-secondary" />
                    <span>{assignedUserName}</span>
                  </div>
                </div>

                {assessment.dueDate && (
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Due Date</h3>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-secondary" />
                      <span>{new Date(assessment.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}

                <div className="flex items-center justify-between">
                  <h3 className="font-medium">Created</h3>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-secondary" />
                    <span>{new Date(assessment.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                {assessment.completedAt && (
                  <div className="flex items-center justify-between">
                    <h3 className="font-medium">Completed</h3>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      <span>{new Date(assessment.completedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {assessment.description && (
              <div className="pt-4 mt-4 border-t border-border">
                <h3 className="font-medium mb-2">Description</h3>
                <p className="text-secondary whitespace-pre-wrap">{assessment.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-neon">
          <CardHeader>
            <CardTitle className="text-[#00ae98]">Summary</CardTitle>
            <CardDescription className="text-secondary">Assessment overview</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-[#00ae98]" />
                  <h3 className="font-medium">Findings</h3>
                </div>
                <Badge variant="outline" className="border-[#00ae98] text-[#00ae98]">
                  {assessment.findings?.length || 0}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-[#00ae98]" />
                  <h3 className="font-medium">Recommendations</h3>
                </div>
                <Badge variant="outline" className="border-[#00ae98] text-[#00ae98]">
                  {assessment.recommendations?.length || 0}
                </Badge>
              </div>

              <div className="pt-4">
                <Link href={`/assessments/${id}/edit`}>
                  <Button className="w-full bg-[#00ae98] hover:bg-[#00ae98]/90 text-white">
                    <Edit className="mr-2 h-4 w-4" />
                    Edit Assessment
                  </Button>
                </Link>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="findings" className="mt-6">
        <TabsList className="mb-6">
          <TabsTrigger value="findings" className="data-[state=active]:bg-[#00ae98] data-[state=active]:text-white">
            Findings
          </TabsTrigger>
          <TabsTrigger
            value="recommendations"
            className="data-[state=active]:bg-[#00ae98] data-[state=active]:text-white"
          >
            Recommendations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="findings">
          <Card className="shadow-neon">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-[#00ae98]">Assessment Findings</CardTitle>
                <Button size="sm" className="bg-[#00ae98] hover:bg-[#00ae98]/90 text-white">
                  Add Finding
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!assessment.findings || assessment.findings.length === 0 ? (
                <div className="text-center py-8 text-secondary">No findings recorded for this assessment yet.</div>
              ) : (
                <div className="space-y-4">
                  {assessment.findings.map((finding, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <h3 className="font-medium text-[#00ae98]">{finding.title}</h3>
                          <p className="text-secondary">{finding.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="recommendations">
          <Card className="shadow-neon">
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-[#00ae98]">Recommendations</CardTitle>
                <Button size="sm" className="bg-[#00ae98] hover:bg-[#00ae98]/90 text-white">
                  Add Recommendation
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {!assessment.recommendations || assessment.recommendations.length === 0 ? (
                <div className="text-center py-8 text-secondary">
                  No recommendations recorded for this assessment yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {assessment.recommendations.map((recommendation, index) => (
                    <Card key={index}>
                      <CardContent className="p-4">
                        <p className="text-secondary">{recommendation}</p>
                      </CardContent>
                    </Card>
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
