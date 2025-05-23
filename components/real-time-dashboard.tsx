"use client"

import { useEffect, useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Activity, Calendar, ClipboardCheck, DollarSign, Users } from "lucide-react"
import { formatDistanceToNow } from "date-fns"

interface RealTimeDashboardProps {
  orgId: string
}

export function RealTimeDashboard({ orgId }: RealTimeDashboardProps) {
  const dashboardData = useQuery(api.realTimeAnalytics.getDashboardData, { orgId })
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null)

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Update last updated time
  useEffect(() => {
    if (dashboardData?.lastUpdated) {
      setLastUpdated(new Date(dashboardData.lastUpdated))
    }
  }, [dashboardData?.lastUpdated])

  // Get icon component based on icon name
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "calendar":
        return <Calendar className="h-4 w-4" />
      case "clipboard-check":
        return <ClipboardCheck className="h-4 w-4" />
      case "credit-card":
        return <DollarSign className="h-4 w-4" />
      case "user-plus":
        return <Users className="h-4 w-4" />
      case "car":
        return <Activity className="h-4 w-4" />
      default:
        return <Activity className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Real-Time Dashboard</h2>
        {lastUpdated && (
          <Badge variant="outline">Updated {formatDistanceToNow(lastUpdated, { addSuffix: true })}</Badge>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dashboardData ? (
              <div className="text-2xl font-bold">{dashboardData.metrics.totalAppointments}</div>
            ) : (
              <Skeleton className="h-8 w-[100px]" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dashboardData ? (
              <div className="text-2xl font-bold">{formatCurrency(dashboardData.metrics.totalRevenue)}</div>
            ) : (
              <Skeleton className="h-8 w-[100px]" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dashboardData ? (
              <div className="text-2xl font-bold">{dashboardData.activeUsers}</div>
            ) : (
              <Skeleton className="h-8 w-[100px]" />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assessments Completed</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {dashboardData ? (
              <div className="text-2xl font-bold">{dashboardData.metrics.assessmentsCompleted}</div>
            ) : (
              <Skeleton className="h-8 w-[100px]" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Activity Feed */}
      <Card>
        <CardHeader>
          <CardTitle>Live Activity Feed</CardTitle>
          <CardDescription>Real-time updates from your organization</CardDescription>
        </CardHeader>
        <CardContent>
          {dashboardData ? (
            <div className="space-y-4">
              {dashboardData.activityFeed.length > 0 ? (
                dashboardData.activityFeed.map((activity) => (
                  <div key={activity.id} className="flex items-start space-x-4">
                    <div className="bg-primary/10 p-2 rounded-full">{getIcon(activity.icon)}</div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium leading-none">
                        <span className="font-bold">{activity.actor}</span> {activity.action} {activity.target}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-4">No recent activity</p>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-start space-x-4">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-3 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
