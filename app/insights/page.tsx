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
  PieChart,
  Pie,
  Cell,
} from "recharts"
import { CalendarIcon, DollarSign, TrendingUp, Users } from "lucide-react"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

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
  topClients: Array<{
    clientId: string
    name: string
    revenue: number
  }>
  servicePopularity: Array<{
    serviceId: string
    name: string
    count: number
  }>
}

function InsightsDashboard() {
  const { getToken } = useAuth()
  const { organization } = useOrganization()
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [dateRange, setDateRange] = useState<"7d" | "30d" | "90d" | "1y">("30d")

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

  // Colors for pie chart
  const COLORS = ["#00AE98", "#707070", "#0088FE", "#00C49F", "#FFBB28", "#FF8042"]

  // Fetch metrics data
  useEffect(() => {
    async function fetchMetrics() {
      try {
        setLoading(true)
        setError(null)

        // Get JWT token for authentication
        const token = await getToken({ template: "convex" })

        // Fetch metrics from API
        const response = await fetch(`/api/insights/metrics?range=${dateRange}`, {
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
  }, [getToken, organization?.id, dateRange])

  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold">Business Insights</h1>
        <p className="text-muted-foreground">Analytics and metrics for your business</p>
      </div>

      {/* Date Range Selector */}
      <div className="flex justify-end">
        <div className="inline-flex items-center rounded-md border border-input bg-background p-1">
          <button
            onClick={() => setDateRange("7d")}
            className={`px-3 py-1 text-sm rounded-sm ${
              dateRange === "7d" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            7D
          </button>
          <button
            onClick={() => setDateRange("30d")}
            className={`px-3 py-1 text-sm rounded-sm ${
              dateRange === "30d" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            30D
          </button>
          <button
            onClick={() => setDateRange("90d")}
            className={`px-3 py-1 text-sm rounded-sm ${
              dateRange === "90d" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            90D
          </button>
          <button
            onClick={() => setDateRange("1y")}
            className={`px-3 py-1 text-sm rounded-sm ${
              dateRange === "1y" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
            }`}
          >
            1Y
          </button>
        </div>
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
            <p className="text-xs text-muted-foreground">Last {dateRange === "1y" ? "year" : dateRange}</p>
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
            <p className="text-xs text-muted-foreground">Last {dateRange === "1y" ? "year" : dateRange}</p>
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
            <p className="text-xs text-muted-foreground">Last {dateRange === "1y" ? "year" : dateRange}</p>
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
            <p className="text-xs text-muted-foreground">Last {dateRange === "1y" ? "year" : dateRange}</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="clients">Top Clients</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Appointments Per Day</CardTitle>
                <CardDescription>Number of appointments scheduled each day</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="h-full w-full" />
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">{error}</p>
                  </div>
                ) : (
                  <ChartContainer
                    config={{
                      count: {
                        label: "Appointments",
                        color: "hsl(var(--chart-1))",
                      },
                    }}
                    className="h-full"
                  >
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
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line
                          type="monotone"
                          dataKey="count"
                          name="Appointments"
                          stroke="var(--color-count)"
                          strokeWidth={2}
                          dot={{ r: 4 }}
                          activeDot={{ r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Revenue Per Month</CardTitle>
                <CardDescription>Total revenue generated each month</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {loading ? (
                  <div className="flex items-center justify-center h-full">
                    <Skeleton className="h-full w-full" />
                  </div>
                ) : error ? (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">{error}</p>
                  </div>
                ) : (
                  <ChartContainer
                    config={{
                      revenue: {
                        label: "Revenue",
                        color: "hsl(var(--chart-2))",
                      },
                    }}
                    className="h-full"
                  >
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
                        <YAxis
                          tick={{ fontSize: 12 }}
                          tickMargin={10}
                          tickFormatter={(value) => formatCurrency(value)}
                        />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="revenue" name="Revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Appointments Per Day</CardTitle>
              <CardDescription>Number of appointments scheduled each day</CardDescription>
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
                <ChartContainer
                  config={{
                    count: {
                      label: "Appointments",
                      color: "hsl(var(--chart-1))",
                    },
                  }}
                  className="h-full"
                >
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
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="count"
                        name="Appointments"
                        stroke="var(--color-count)"
                        strokeWidth={2}
                        dot={{ r: 4 }}
                        activeDot={{ r: 6 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Revenue Per Month</CardTitle>
              <CardDescription>Total revenue generated each month</CardDescription>
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
                <ChartContainer
                  config={{
                    revenue: {
                      label: "Revenue",
                      color: "hsl(var(--chart-2))",
                    },
                  }}
                  className="h-full"
                >
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
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="var(--color-revenue)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Top Clients Tab */}
        <TabsContent value="clients" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Clients by Revenue</CardTitle>
              <CardDescription>Clients generating the most revenue</CardDescription>
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
                <ChartContainer
                  config={{
                    revenue: {
                      label: "Revenue",
                      color: "hsl(var(--chart-3))",
                    },
                  }}
                  className="h-full"
                >
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={metrics?.topClients}
                      layout="vertical"
                      margin={{ top: 20, right: 30, left: 100, bottom: 10 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Legend />
                      <Bar dataKey="revenue" name="Revenue" fill="var(--color-revenue)" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </ChartContainer>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Tab */}
        <TabsContent value="services" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Service Popularity</CardTitle>
              <CardDescription>Most frequently booked services</CardDescription>
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-full">
                  <div>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={metrics?.servicePopularity}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                          nameKey="name"
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                        >
                          {metrics?.servicePopularity.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value, name, props) => [`${value} appointments`, props.payload.name]} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div>
                    <ChartContainer
                      config={{
                        count: {
                          label: "Appointments",
                          color: "hsl(var(--chart-4))",
                        },
                      }}
                      className="h-full"
                    >
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={metrics?.servicePopularity}
                          layout="vertical"
                          margin={{ top: 20, right: 30, left: 100, bottom: 10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis type="number" />
                          <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={100} />
                          <ChartTooltip content={<ChartTooltipContent />} />
                          <Bar dataKey="count" name="Appointments" fill="var(--color-count)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </ChartContainer>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

export default withAuth(InsightsDashboard, ["admin"])
