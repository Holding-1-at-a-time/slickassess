"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { TrendingUp, TrendingDown, Minus, Calendar, DollarSign, Users, ClipboardCheck } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"

interface AnalyticsOverviewProps {
  orgId: string
  dateRange: { from: Date; to: Date }
}

export function AnalyticsOverview({ orgId, dateRange }: AnalyticsOverviewProps) {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [overviewData, setOverviewData] = useState<any>(null)
  const [revenueData, setRevenueData] = useState<any[]>([])
  const [appointmentData, setAppointmentData] = useState<any[]>([])

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format percentage change
  const formatChange = (change: number) => {
    const isPositive = change > 0
    const isNegative = change < 0
    const icon = isPositive ? (
      <TrendingUp className="h-4 w-4" />
    ) : isNegative ? (
      <TrendingDown className="h-4 w-4" />
    ) : (
      <Minus className="h-4 w-4" />
    )
    const color = isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-gray-600"

    return (
      <div className={`flex items-center space-x-1 ${color}`}>
        {icon}
        <span className="text-sm font-medium">{Math.abs(change).toFixed(1)}%</span>
      </div>
    )
  }

  // Fetch analytics data
  useEffect(() => {
    async function fetchAnalytics() {
      try {
        setLoading(true)

        // Get JWT token for authentication
        const token = await getToken({ template: "convex" })

        // Fetch overview metrics
        const overviewResponse = await fetch(
          `/api/analytics/v1?endpoint=overview&startDate=${dateRange.from.toISOString()}&endDate=${dateRange.to.toISOString()}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (overviewResponse.ok) {
          const overview = await overviewResponse.json()
          setOverviewData(overview)
        }

        // Fetch revenue data
        const revenueResponse = await fetch(
          `/api/analytics/v1?endpoint=revenue&startDate=${dateRange.from.toISOString()}&endDate=${dateRange.to.toISOString()}&granularity=day`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (revenueResponse.ok) {
          const revenue = await revenueResponse.json()
          setRevenueData(revenue.data || [])
        }

        // Fetch appointment data
        const appointmentResponse = await fetch(
          `/api/analytics/v1?endpoint=appointments&startDate=${dateRange.from.toISOString()}&endDate=${dateRange.to.toISOString()}&granularity=day`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (appointmentResponse.ok) {
          const appointments = await appointmentResponse.json()
          setAppointmentData(appointments.data || [])
        }
      } catch (error) {
        console.error("Error fetching analytics:", error)
      } finally {
        setLoading(false)
      }
    }

    if (orgId) {
      fetchAnalytics()
    }
  }, [getToken, orgId, dateRange])

  return (
    <div className="space-y-6">
      {/* Overview Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <>
                <div className="text-2xl font-bold">{overviewData?.metrics?.appointments?.total || 0}</div>
                <div className="flex items-center justify-between mt-2">
                  {formatChange(overviewData?.metrics?.appointments?.change || 0)}
                  <span className="text-xs text-muted-foreground">vs previous period</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <>
                <div className="text-2xl font-bold">{formatCurrency(overviewData?.metrics?.revenue?.total || 0)}</div>
                <div className="flex items-center justify-between mt-2">
                  {formatChange(overviewData?.metrics?.revenue?.change || 0)}
                  <span className="text-xs text-muted-foreground">vs previous period</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">New Clients</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <>
                <div className="text-2xl font-bold">{overviewData?.metrics?.clients?.total || 0}</div>
                <div className="flex items-center justify-between mt-2">
                  {formatChange(overviewData?.metrics?.clients?.change || 0)}
                  <span className="text-xs text-muted-foreground">vs previous period</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Assessments Completed</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <>
                <div className="text-2xl font-bold">{overviewData?.metrics?.assessments?.total || 0}</div>
                <div className="flex items-center justify-between mt-2">
                  {formatChange(overviewData?.metrics?.assessments?.change || 0)}
                  <span className="text-xs text-muted-foreground">vs previous period</span>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Revenue Trend</CardTitle>
            <CardDescription>Daily revenue over the selected period</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : revenueData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis tickFormatter={(value) => `$${value}`} />
                  <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Revenue"]} />
                  <Line type="monotone" dataKey="revenue" stroke="#00AE98" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No revenue data available</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appointment Activity</CardTitle>
            <CardDescription>Daily appointment metrics</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {loading ? (
              <Skeleton className="h-full w-full" />
            ) : appointmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={appointmentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="period" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="created" fill="#00AE98" name="Created" />
                  <Bar dataKey="completed" fill="#707070" name="Completed" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No appointment data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
