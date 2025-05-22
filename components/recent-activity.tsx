"use client"

import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth } from "@clerk/nextjs"
import { Card, CardContent } from "@/components/ui/card"
import { CassetteLoader } from "@/components/cassette-loader"
import { handleError } from "@/lib/error-handling"
import { Users, Car, FileText, Clock } from "lucide-react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"

export function RecentActivity() {
  const { getToken } = useAuth()
  const [token, setToken] = useState<string | null>(null)

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

  // Fetch recent clients
  const recentClients = useQuery(
    api.clients.getClients,
    { sortBy: "recent", limit: 5 },
    {
      additionalHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )

  // Fetch recent vehicles
  const recentVehicles = useQuery(
    api.vehicles.getVehicles,
    { sortBy: "recent", limit: 5 },
    {
      additionalHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )

  // Fetch recent assessments
  const recentAssessments = useQuery(
    api.assessments.getAssessments,
    { sortBy: "recent", limit: 5 },
    {
      additionalHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )

  if (recentClients === undefined || recentVehicles === undefined || recentAssessments === undefined) {
    return <CassetteLoader />
  }

  // Combine and sort all recent activities
  const allActivities = [
    ...recentClients.map((client) => ({
      type: "client",
      id: client._id,
      name: client.name,
      timestamp: client.createdAt,
      status: client.status,
    })),
    ...recentVehicles.map((vehicle) => ({
      type: "vehicle",
      id: vehicle._id,
      name: `${vehicle.make} ${vehicle.model} (${vehicle.year})`,
      timestamp: vehicle.createdAt,
      clientName: vehicle.clientName,
      status: vehicle.status,
    })),
    ...recentAssessments.map((assessment) => ({
      type: "assessment",
      id: assessment._id,
      name: assessment.title,
      timestamp: assessment.createdAt,
      vehicleName: assessment.vehicleName,
      clientName: assessment.clientName,
      status: assessment.status,
    })),
  ]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10)

  const getActivityIcon = (type: string) => {
    switch (type) {
      case "client":
        return <Users className="h-4 w-4 text-[#00ae98]" />
      case "vehicle":
        return <Car className="h-4 w-4 text-[#00ae98]" />
      case "assessment":
        return <FileText className="h-4 w-4 text-[#00ae98]" />
      default:
        return null
    }
  }

  const getActivityLink = (activity: any) => {
    switch (activity.type) {
      case "client":
        return `/clients/${activity.id}`
      case "vehicle":
        return `/vehicles/${activity.id}`
      case "assessment":
        return `/assessments/${activity.id}`
      default:
        return "#"
    }
  }

  const getStatusBadge = (status: string, type: string) => {
    let color = ""

    if (status === "active") color = "bg-green-500 hover:bg-green-600"
    else if (status === "pending") color = "bg-amber-500 hover:bg-amber-600"
    else if (status === "completed") color = "bg-green-500 hover:bg-green-600"
    else if (status === "in_progress") color = "border-[#00ae98] text-[#00ae98] bg-transparent"
    else color = "bg-secondary"

    return <Badge className={color}>{status}</Badge>
  }

  return (
    <Card className="shadow-neon">
      <CardContent className="p-6">
        {allActivities.length === 0 ? (
          <div className="text-center py-8 text-secondary">No recent activity found.</div>
        ) : (
          <div className="space-y-6">
            {allActivities.map((activity, index) => (
              <div
                key={index}
                className="flex items-start justify-between border-b border-border pb-4 last:border-0 last:pb-0"
              >
                <div className="flex items-start gap-3">
                  <div className="mt-1">{getActivityIcon(activity.type)}</div>
                  <div>
                    <Link
                      href={getActivityLink(activity)}
                      className="font-medium hover:text-[#00ae98] transition-colors"
                    >
                      {activity.name}
                    </Link>
                    <div className="text-sm text-secondary">
                      {activity.type === "client" ? (
                        <span>Client added</span>
                      ) : activity.type === "vehicle" ? (
                        <span>Vehicle added for {activity.clientName}</span>
                      ) : (
                        <span>
                          Assessment for {activity.vehicleName} ({activity.clientName})
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-secondary flex items-center mt-1">
                      <Clock className="h-3 w-3 mr-1" />
                      {new Date(activity.timestamp).toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">{getStatusBadge(activity.status, activity.type)}</div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
