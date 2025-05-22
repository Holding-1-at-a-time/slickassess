"use client"

import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth } from "@clerk/nextjs"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { CassetteLoader } from "@/components/cassette-loader"
import { handleError } from "@/lib/error-handling"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { FileText, Car, Building, Calendar, MoreHorizontal, Edit, Trash2, CheckCircle } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Link from "next/link"

export function AssessmentList() {
  const { getToken } = useAuth()
  const [token, setToken] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  const status = searchParams.get("status") || undefined
  const assignedTo = searchParams.get("assignedTo") || undefined
  const sortBy = searchParams.get("sortBy") || "recent"

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

  // Fetch assessments using the token
  const assessments = useQuery(
    api.assessments.getAssessments,
    {
      status,
      assignedTo,
      sortBy,
    },
    {
      additionalHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )

  if (assessments === undefined) {
    return <CassetteLoader />
  }

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

  return (
    <Card className="shadow-neon mt-6">
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Assessment</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {assessments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-secondary">
                    No assessments found. Create your first assessment to get started.
                  </TableCell>
                </TableRow>
              ) : (
                assessments.map((assessment) => (
                  <TableRow key={assessment._id} className="hover:bg-[#00ae98]/5">
                    <TableCell className="font-medium">
                      <Link href={`/assessments/${assessment._id}`} className="hover:text-[#00ae98] transition-colors">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-[#00ae98]" />
                          {assessment.title}
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/vehicles/${assessment.vehicleId}`}
                        className="hover:text-[#00ae98] transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <Car className="h-4 w-4 text-secondary" />
                          <span>{assessment.vehicleName}</span>
                        </div>
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4 text-secondary" />
                        <span>{assessment.clientName}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {assessment.dueDate ? (
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-secondary" />
                          <span>{new Date(assessment.dueDate).toLocaleDateString()}</span>
                        </div>
                      ) : (
                        <span className="text-secondary">Not set</span>
                      )}
                    </TableCell>
                    <TableCell>{getStatusBadge(assessment.status)}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0 text-[#00ae98] hover:text-[#00ae98]/90 hover:bg-[#00ae98]/10"
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => router.push(`/assessments/${assessment._id}`)}
                          >
                            <FileText className="mr-2 h-4 w-4" />
                            <span>View Details</span>
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="cursor-pointer"
                            onClick={() => router.push(`/assessments/${assessment._id}/edit`)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            <span>Edit Assessment</span>
                          </DropdownMenuItem>
                          {assessment.status !== "completed" && (
                            <DropdownMenuItem className="cursor-pointer text-green-600">
                              <CheckCircle className="mr-2 h-4 w-4" />
                              <span>Mark as Completed</span>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="cursor-pointer text-red-600">
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Delete Assessment</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
