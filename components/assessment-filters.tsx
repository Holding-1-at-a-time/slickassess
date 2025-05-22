"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent } from "@/components/ui/card"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useOrganization } from "@clerk/nextjs"

export function AssessmentFilters() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { organization } = useOrganization()

  const [status, setStatus] = useState(searchParams.get("status") || "")
  const [assignedTo, setAssignedTo] = useState(searchParams.get("assignedTo") || "")
  const [sortBy, setSortBy] = useState(searchParams.get("sortBy") || "recent")

  // Apply filters when they change
  useEffect(() => {
    const params = new URLSearchParams()
    if (status) params.set("status", status)
    if (assignedTo) params.set("assignedTo", assignedTo)
    if (sortBy) params.set("sortBy", sortBy)

    router.push(`/assessments?${params.toString()}`)
  }, [status, assignedTo, sortBy, router])

  // Clear all filters
  const clearFilters = () => {
    setStatus("")
    setAssignedTo("")
    setSortBy("recent")
    router.push("/assessments")
  }

  return (
    <Card className="shadow-neon">
      <CardContent className="p-4">
        <div className="grid gap-4 md:grid-cols-3">
          <Select value={status} onValueChange={setStatus}>
            <SelectTrigger className="border-secondary focus:ring-[#00ae98]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="in_progress">In Progress</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
            </SelectContent>
          </Select>

          <Select value={assignedTo} onValueChange={setAssignedTo}>
            <SelectTrigger className="border-secondary focus:ring-[#00ae98]">
              <SelectValue placeholder="Assigned To" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Assignees</SelectItem>
              {organization?.memberships?.map((member) => (
                <SelectItem key={member.publicUserData.userId} value={member.publicUserData.userId}>
                  {member.publicUserData.firstName} {member.publicUserData.lastName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="border-secondary focus:ring-[#00ae98]">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recently Created</SelectItem>
              <SelectItem value="due_date">Due Date</SelectItem>
            </SelectContent>
          </Select>

          {(status || assignedTo || sortBy !== "recent") && (
            <div className="md:col-span-3 flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearFilters} className="text-secondary hover:text-[#00ae98]">
                <X className="mr-2 h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
