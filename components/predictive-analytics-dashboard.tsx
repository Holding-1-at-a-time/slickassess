"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from "recharts"
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react"

interface PredictiveAnalyticsDashboardProps {
  orgId: string
}

export function PredictiveAnalyticsDashboard({ orgId }: PredictiveAnalyticsDashboardProps) {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [appointmentForecast, setAppointmentForecast] = useState<any>(null)
  const [revenueForecast, setRevenueForecast] = useState<any>(null)
  const [selectedTimeframe, setSelectedTimeframe] = useState("30")

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Fetch predictive analytics data
  useEffect(() => {
    async function fetchPredictiveData() {
      try {
        setLoading(true)

        // Get JWT token for authentication
        const token = await getToken({ template: "convex" })

        // Fetch appointment forecast
        const appointmentResponse = await fetch(
          `/api/analytics/predictive?type=appointments&days=${selectedTimeframe}&forecastDays=14`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          },
        )

        if (appointmentResponse.ok) {
          const appointmentData = await appointmentResponse.json()
          setAppointmentForecast(appointmentData)
        }

        // Fetch revenue forecast
        const revenueResponse = await fetch(`/api/analytics/predictive?type=revenue&months=12&forecastMonths=3`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (revenueResponse.ok) {
          const revenueData = await revenueResponse.json()
          setRevenueForecast(revenueData)
        }
      } catch (error) {
        console.error("Error fetching predictive analytics:", error)
      } finally {
        setLoading(false)
      }
    }

    if (orgId) {
      fetchPredictiveData()
    }
  }, [getToken, orgId, selectedTimeframe])

  // Get trend icon
  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "increasing":
        return <TrendingUp className="h-4 w-4 text-green-500" />
      case "decreasing":
        return <TrendingDown className="h-4 w-4 text-red-500" />
      default:
        return <Minus className="h-4 w-4 text-gray-500" />
    }
  }

  // Get trend color
  const getTrendColor = (trend: string) => {
    switch (trend) {
      case "increasing":
        return "text-green-600"
      case "decreasing":
        return "text-red-600"
      default:
        return "text-gray-600"
    }
  }

  // Combine historical and forecast data for charts
  const getAppointmentChartData = () => {
    if (!appointmentForecast) return []

    const historical = appointmentForecast.historicalData.map((item: any) => ({
      date: item.date,
      actual: item.count,
      forecast: null,
      type: "historical",
    }))

    const forecast = appointmentForecast.forecastData.map((item: any) => ({
      date: item.date,
      actual: null,
      forecast: item.count,
      confidence: item.confidence,
      type: "forecast",
    }))

    return [...historical, ...forecast]
  }

  const getRevenueChartData = () => {
    if (!revenueForecast) return []

    const historical = revenueForecast.historicalData.map((item: any) => ({
      month: item.month,
      actual: item.revenue,
      forecast: null,
      type: "historical",
    }))

    const forecast = revenueForecast.forecastData.map((item: any) => ({
      month: item.month,
      actual: null,
      forecast: item.revenue,
      confidence: item.confidence,
      type: "forecast",
    }))

    return [...historical, ...forecast]
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Predictive Analytics</h2>
          <p className="text-muted-foreground">AI-powered forecasts and predictions</p>
        </div>
        <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
          <SelectTrigger className="w-[120px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="30">30 days</SelectItem>
            <SelectItem value="60">60 days</SelectItem>
            <SelectItem value="90">90 days</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="appointments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="appointments">Appointment Forecast</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Forecast</TabsTrigger>
          <TabsTrigger value="churn">Churn Prediction</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Trend Direction</CardTitle>
                {appointmentForecast && getTrendIcon(appointmentForecast.trend)}
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-6 w-20" />
                ) : appointmentForecast ? (
                  <div className={`text-lg font-bold capitalize ${getTrendColor(appointmentForecast.trend)}`}>
                    {appointmentForecast.trend}
                  </div>
                ) : (
                  <div className="text-lg font-bold text-gray-500">No data</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Forecast Confidence</CardTitle>
                <Badge variant={appointmentForecast?.confidence > 0.7 ? "default" : "secondary"}>
                  {appointmentForecast ? `${Math.round(appointmentForecast.confidence * 100)}%` : "N/A"}
                </Badge>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-6 w-16" />
                ) : appointmentForecast ? (
                  <div className="text-lg font-bold">
                    {appointmentForecast.confidence > 0.7
                      ? "High"
                      : appointmentForecast.confidence > 0.5
                        ? "Medium"
                        : "Low"}
                  </div>
                ) : (
                  <div className="text-lg font-bold text-gray-500">No data</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Next 14 Days</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-6 w-12" />
                ) : appointmentForecast ? (
                  <div className="text-lg font-bold">
                    {appointmentForecast.forecastData.reduce((sum: number, item: any) => sum + item.count, 0)}
                  </div>
                ) : (
                  <div className="text-lg font-bold text-gray-500">No data</div>
                )}
                <p className="text-xs text-muted-foreground">Predicted appointments</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Appointment Forecast</CardTitle>
              <CardDescription>Historical data and 14-day forecast</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : appointmentForecast ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={getAppointmentChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line
                      type="monotone"
                      dataKey="actual"
                      stroke="#2563eb"
                      strokeWidth={2}
                      dot={{ fill: "#2563eb" }}
                      connectNulls={false}
                      name="Historical"
                    />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      stroke="#dc2626"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ fill: "#dc2626" }}
                      connectNulls={false}
                      name="Forecast"
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No forecast data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Revenue Trend</CardTitle>
                {revenueForecast && getTrendIcon(revenueForecast.trend)}
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-6 w-20" />
                ) : revenueForecast ? (
                  <div className={`text-lg font-bold capitalize ${getTrendColor(revenueForecast.trend)}`}>
                    {revenueForecast.trend}
                  </div>
                ) : (
                  <div className="text-lg font-bold text-gray-500">No data</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Forecast Confidence</CardTitle>
                <Badge variant={revenueForecast?.confidence > 0.7 ? "default" : "secondary"}>
                  {revenueForecast ? `${Math.round(revenueForecast.confidence * 100)}%` : "N/A"}
                </Badge>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-6 w-16" />
                ) : revenueForecast ? (
                  <div className="text-lg font-bold">
                    {revenueForecast.confidence > 0.7 ? "High" : revenueForecast.confidence > 0.5 ? "Medium" : "Low"}
                  </div>
                ) : (
                  <div className="text-lg font-bold text-gray-500">No data</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Next 3 Months</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <Skeleton className="h-6 w-20" />
                ) : revenueForecast ? (
                  <div className="text-lg font-bold">
                    {formatCurrency(
                      revenueForecast.forecastData.reduce((sum: number, item: any) => sum + item.revenue, 0),
                    )}
                  </div>
                ) : (
                  <div className="text-lg font-bold text-gray-500">No data</div>
                )}
                <p className="text-xs text-muted-foreground">Predicted revenue</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue Forecast</CardTitle>
              <CardDescription>Historical data and 3-month forecast</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : revenueForecast ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={getRevenueChartData()}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Revenue"]} />
                    <Bar dataKey="actual" fill="#2563eb" name="Historical" />
                    <Bar dataKey="forecast" fill="#dc2626" name="Forecast" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No forecast data available</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="churn" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-500" />
                Customer Churn Prediction
              </CardTitle>
              <CardDescription>Identify customers at risk of churning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Select a specific customer to view their churn prediction, or use the customer segmentation tab to
                  identify at-risk customers.
                </p>
                <Button className="mt-4" variant="outline">
                  View Customer Segments
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
