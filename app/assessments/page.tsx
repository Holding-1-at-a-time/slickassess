"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useRouter, useSearchParams } from "next/navigation"
import { withAuth } from "@/components/with-auth"
import { CassetteLoader } from "@/components/cassette-loader"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, ChevronLeft, ChevronRight } from "lucide-react"
import Link from "next/link"

function AssessmentListPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [page, setPage] = useState(1)
  const limit = 20

  // Get filter params from URL
  const clientId = searchParams.get("clientId") || undefined
  const vehicleId = searchParams.get("vehicleId") || undefined
  const status = searchParams.get("status") || undefined

  // Fetch assessments with filters
  const assessments = useQuery(api.assessments.list, {
    clientId,
    vehicleId,
    status,
    page,
    limit,
  })

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

  if (!assessments) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <CassetteLoader />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-[#00ae98] neon-text">Assessments</h1>
        <Link href="/assessments/new">
          <Button className="bg-[#00ae98] hover:bg-[#00ae98]/90">
            <Plus className="mr-2 h-4 w-4" />
            New Assessment
          </Button>
        </Link>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Assessment #</TableHead>
              <TableHead>Vehicle</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assessments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No assessments found
                </TableCell>
              </TableRow>
            ) : (
              assessments.map((assessment: any) => (
                <TableRow
                  key={assessment._id}
                  className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
                  onClick={() => router.push(`/vehicles/${assessment.vehicleId}/assessments/${assessment._id}`)}
                >
                  <TableCell className="font-medium">{assessment.assessmentNumber}</TableCell>
                  <TableCell>{assessment.vehicleInfo}</TableCell>
                  <TableCell>{assessment.clientName}</TableCell>
                  <TableCell>{new Date(assessment.assessmentDate).toLocaleDateString()}</TableCell>
                  <TableCell>
                    <Badge className={getStatusColor(assessment.status)}>{assessment.status.replace("_", " ")}</Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex justify-between items-center mt-4">
        <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(p - 1, 1))} disabled={page === 1}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <span className="text-sm text-gray-500">Page {page}</span>
        <Button variant="outline" size="sm" onClick={() => setPage((p) => p + 1)} disabled={assessments.length < limit}>
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  )
}

export default withAuth(AssessmentListPage, ["admin", "staff", "assessor"])
