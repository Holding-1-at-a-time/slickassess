"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Clock, Star, CheckCircle, XCircle, AlertCircle } from "lucide-react"

interface PerformanceMetricsProps {
  orgId: string
}

export function PerformanceMetrics({ orgId }: PerformanceMetricsProps) {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [performanceData, setPerformanceData] = useState<any>(null)

  // Fetch performance metrics
  useEffect(() => {
    async function fetchPerformanceData() {
      try {
        setLoading(true)

        // Get JWT token for authentication
        const token = await getToken({ template: "convex" })

        // Fetch performance metrics
        const response = await fetch(`/api/analytics/v1?endpoint=performance&days=30`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (response.ok) {
          const result = await response.json()
          setPerformanceData(result.data)
        }
      } catch (error) {
        console.error("Error fetching performance metrics:", error)
      } finally {
        setLoading(false)
      }
    }

    if (orgId) {
      fetchPerformanceData()
    }
  }, [getToken, orgId])

  // Format time duration
  const formatDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${Math.round(minutes)}m`
    }
    const hours = Math.floor(minutes / 60)
    const remainingMinutes = Math.round(minutes % 60)
    return `${hours}h ${remainingMinutes}m`
  }

  // Get performance badge color
  const getPerformanceBadge = (rate: number) => {
    if (rate >= 90) return { variant: "default" as const, label: "Excellent" }
    if (rate >= 80) return { variant: "secondary" as const, label: "Good" }
    if (rate >= 70) return { variant: "outline" as const, label: "Fair" }
    return { variant: "destructive" as const, label: "Needs Improvement" }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Performance Metrics</h2>
        <p className="text-muted-foreground">Key performance indicators and efficiency metrics</p>
      </div>

      {/* Assessment Performance */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Assessment Time</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 w-16" />
            ) : performanceData ? (
              <div className="text-2xl font-bold">{formatDuration(performanceData.avg_assessment_time || 0)}</div>
            ) : (
              <div className="text-2xl font-bold text-gray-500">No data</div>
            )}
            <p className="text-xs text-muted-foreground">
              Median: {loading ? "..." : formatDuration(performanceData?.median_assessment_time || 0)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Customer Satisfaction</CardTitle>
            <Star className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 w-12" />
            ) : performanceData ? (
              <div className="text-2xl font-bold">{(performanceData.avg_satisfaction_score || 0).toFixed(1)}/5</div>
            ) : (
              <div className="text-2xl font-bold text-gray-500">No data</div>
            )}
            <p className="text-xs text-muted-foreground">
              {loading ? "..." : `${performanceData?.satisfied_customers || 0} satisfied customers`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 w-12" />
            ) : performanceData ? (
              <div className="text-2xl font-bold">{(performanceData.completion_rate || 0).toFixed(1)}%</div>
            ) : (
              <div className="text-2xl font-bold text-gray-500">No data</div>
            )}
            <p className="text-xs text-muted-foreground">
              {loading ? "..." : `${performanceData?.completed_appointments || 0} completed`}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfaction Rate</CardTitle>
            <Badge variant={loading ? "outline" : getPerformanceBadge(performanceData?.satisfaction_rate || 0).variant}>
              {loading ? "Loading..." : getPerformanceBadge(performanceData?.satisfaction_rate || 0).label}
            </Badge>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-6 w-12" />
            ) : performanceData ? (
              <div className="text-2xl font-bold">{(performanceData.satisfaction_rate || 0).toFixed(1)}%</div>
            ) : (
              <div className="text-2xl font-bold text-gray-500">No data</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Detailed Performance Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Appointment Performance</CardTitle>
            <CardDescription>Breakdown of appointment outcomes</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-2 w-full" />
                  </div>
                ))}
              </div>
            ) : performanceData ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-500" />
                      Completed
                    </span>
                    <span>{performanceData.completed_appointments || 0}</span>
                  </div>
                  <Progress
                    value={
                      performanceData.total_appointments > 0
                        ? (performanceData.completed_appointments / performanceData.total_appointments) * 100
                        : 0
                    }
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <XCircle className="h-4 w-4 text-red-500" />
                      Cancelled
                    </span>
                    <span>{performanceData.cancelled_appointments || 0}</span>
                  </div>
                  <Progress
                    value={
                      performanceData.total_appointments > 0
                        ? (performanceData.cancelled_appointments / performanceData.total_appointments) * 100
                        : 0
                    }
                    className="h-2"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-orange-500" />
                      No Show
                    </span>
                    <span>{performanceData.no_show_appointments || 0}</span>
                  </div>
                  <Progress
                    value={
                      performanceData.total_appointments > 0
                        ? (performanceData.no_show_appointments / performanceData.total_appointments) * 100
                        : 0
                    }
                    className="h-2"
                  />
                </div>

                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>Total Appointments</span>
                    <span>{performanceData.total_appointments || 0}</span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-4">No performance data available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assessment Quality</CardTitle>
            <CardDescription>Assessment completion and quality metrics</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="space-y-2">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                ))}
              </div>
            ) : performanceData ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Assessments</span>
                    <span className="text-2xl font-bold">{performanceData.total_assessments || 0}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Average Completion Time</span>
                    <span className="text-lg font-semibold">
                      {formatDuration(performanceData.avg_assessment_time || 0)}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Median: {formatDuration(performanceData.median_assessment_time || 0)}
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Customer Satisfaction</span>
                    <div className="flex items-center gap-2">
                      <Star className="h-4 w-4 text-yellow-500 fill-current" />
                      <span className="text-lg font-semibold">
                        {(performanceData.avg_satisfaction_score || 0).toFixed(1)}/5
                      </span>
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {performanceData.satisfied_customers || 0} out of {performanceData.total_responses || 0} responses
                  </div>
                </div>
              </>
            ) : (
              <p className="text-center text-muted-foreground py-4">No assessment data available</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
