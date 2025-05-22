"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useOrganization } from "@clerk/nextjs"
import { withAuth } from "@/components/with-auth"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts"
import { CalendarIcon, DollarSign, TrendingUp, Users } from "lucide-react"

// Define the metrics data structure
interface MetricsData {
  appointmentsPerDay: Array<{
    date: string
    count: number
  }>
  revenuePerMonth: Array<{
    month: string
    revenue: number
  }>
}

function InsightsDashboard() {
  const { getToken } = useAuth()
  const { organization } = useOrganization()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })
  }

  // Format month for display
  const formatMonth = (monthString: string) => {
    const [year, month] = monthString.split("-")
    const date = new Date(Number.parseInt(year), Number.parseInt(month) - 1, 1)
    return date.toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    })
  }

  // Calculate total appointments
  const totalAppointments = metrics?.appointmentsPerDay.reduce((sum, day) => sum + day.count, 0) || 0

  // Calculate total revenue
  const totalRevenue = metrics?.revenuePerMonth.reduce((sum, month) => sum + month.revenue, 0) || 0

  // Calculate average appointments per day
  const avgAppointmentsPerDay = totalAppointments / (metrics?.appointmentsPerDay.length || 1)

  // Calculate average revenue per month
  const avgRevenuePerMonth = totalRevenue / (metrics?.revenuePerMonth.length || 1)

  // Fetch metrics data
  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true)
        setError(null)

        // Get JWT token for authentication
        const token = await getToken({ template: "convex" })

        // Fetch metrics from API
        const response = await fetch("/api/insights/metrics", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch metrics")
        }

        const data = await response.json()
        setMetrics(data)
      } catch (error) {
        console.error("Error fetching metrics:", error)
        setError("Failed to fetch metrics. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    if (organization?.id) {
      fetchMetrics()
    }
  }, [getToken, organization?.id])

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Business Insights</h1>
        <p className="text-muted-foreground">Analytics and metrics for your business</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <div className="text-2xl font-bold">{totalAppointments}</div>
            )}
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Appointments/Day</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <div className="text-2xl font-bold">{avgAppointmentsPerDay.toFixed(1)}</div>
            )}
            <p className="text-xs text-muted-foreground">Last 30 days</p>
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
              <div className="text-2xl font-bold">{formatCurrency(totalRevenue)}</div>
            )}
            <p className="text-xs text-muted-foreground">Last 12 months</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Revenue/Month</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-[100px]" />
            ) : (
              <div className="text-2xl font-bold">{formatCurrency(avgRevenuePerMonth)}</div>
            )}
            <p className="text-xs text-muted-foreground">Last 12 months</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="appointments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
        </TabsList>
        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appointments Per Day</CardTitle>
              <CardDescription>Number of appointments scheduled each day over the last 30 days</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">{error}</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={metrics?.appointmentsPerDay.map((day) => ({
                      ...day,
                      formattedDate: formatDate(day.date),
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="formattedDate" tick={{ fontSize: 12 }} tickMargin={10} />
                    <YAxis tick={{ fontSize: 12 }} tickMargin={10} allowDecimals={false} />
                    <Tooltip
                      formatter={(value) => [`${value} appointments`, "Count"]}
                      labelFormatter={(label) => `Date: ${label}`}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      name="Appointments"
                      stroke="#00AE98"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Per Month</CardTitle>
              <CardDescription>Total revenue generated each month over the last 12 months</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : error ? (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">{error}</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={metrics?.revenuePerMonth.map((month) => ({
                      ...month,
                      formattedMonth: formatMonth(month.month),
                    }))}
                    margin={{ top: 20, right: 30, left: 20, bottom: 10 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="formattedMonth" tick={{ fontSize: 12 }} tickMargin={10} />
                    <YAxis tick={{ fontSize: 12 }} tickMargin={10} tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip
                      formatter={(value) => [formatCurrency(value as number), "Revenue"]}
                      labelFormatter={(label) => `Month: ${label}`}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue" fill="#707070" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default withAuth(InsightsDashboard, ["admin"])
