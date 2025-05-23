"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { TrendingUp, TrendingDown, Minus, AlertTriangle } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

interface PredictiveAnalyticsProps {
  orgId: string
}

export function PredictiveAnalytics({ orgId }: PredictiveAnalyticsProps) {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [appointmentForecast, setAppointmentForecast] = useState<any>(null)
  const [revenueForecast, setRevenueForecast] = useState<any>(null)

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Get trend icon and color
  const getTrendDisplay = (trend: string) => {
    switch (trend) {
      case "increasing":
        return { icon: <TrendingUp className="h-4 w-4" />, color: "text-green-600", label: "Increasing" }
      case "decreasing":
        return { icon: <TrendingDown className="h-4 w-4" />, color: "text-red-600", label: "Decreasing" }
      default:
        return { icon: <Minus className="h-4 w-4" />, color: "text-gray-600", label: "Stable" }
    }
  }

  // Fetch predictive analytics data
  useEffect(() => {
    async function fetchPredictiveData() {
      try {
        setLoading(true)

        // Get JWT token for authentication
        const token = await getToken({ template: "convex" })

        // Fetch appointment forecast
        const appointmentResponse = await fetch(`/api/analytics/predictive?type=appointments&days=30&forecastDays=14`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (appointmentResponse.ok) {
          const appointments = await appointmentResponse.json()
          setAppointmentForecast(appointments)
        }

        // Fetch revenue forecast
        const revenueResponse = await fetch(`/api/analytics/predictive?type=revenue&months=12&forecastMonths=3`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (revenueResponse.ok) {
          const revenue = await revenueResponse.json()
          setRevenueForecast(revenue)
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
  }, [getToken, orgId])

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Predictive Analytics</h2>

      <Tabs defaultValue="appointments" className="space-y-4">
        <TabsList>
          <TabsTrigger value="appointments">Appointment Forecast</TabsTrigger>
          <TabsTrigger value="revenue">Revenue Forecast</TabsTrigger>
          <TabsTrigger value="churn">Churn Prediction</TabsTrigger>
        </TabsList>

        <TabsContent value="appointments" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Forecast Summary</CardTitle>
                <CardDescription>Next 14 days appointment prediction</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : appointmentForecast ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Trend:</span>
                      <div
                        className={`flex items-center space-x-1 ${getTrendDisplay(appointmentForecast.trend).color}`}
                      >
                        {getTrendDisplay(appointmentForecast.trend).icon}
                        <span className="text-sm">{getTrendDisplay(appointmentForecast.trend).label}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Confidence:</span>
                      <Badge variant="outline" className="ml-2">
                        {(appointmentForecast.confidence * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Predicted Total:</span>
                      <span className="ml-2 text-lg font-bold">
                        {appointmentForecast.forecastData?.reduce((sum: number, item: any) => sum + item.count, 0) || 0}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No forecast data available</p>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Appointment Forecast Chart</CardTitle>
                <CardDescription>Historical data and 14-day forecast</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {loading ? (
                  <Skeleton className="h-full w-full" />
                ) : appointmentForecast && appointmentForecast.historicalData?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[
                        ...appointmentForecast.historicalData.map((item: any) => ({
                          ...item,
                          type: "historical",
                        })),
                        ...appointmentForecast.forecastData.map((item: any) => ({
                          ...item,
                          type: "forecast",
                        })),
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#00AE98"
                        strokeWidth={2}
                        strokeDasharray={(entry: any) => (entry?.type === "forecast" ? "5 5" : "0")}
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
          </div>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Revenue Forecast</CardTitle>
                <CardDescription>Next 3 months revenue prediction</CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ) : revenueForecast ? (
                  <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium">Trend:</span>
                      <div className={`flex items-center space-x-1 ${getTrendDisplay(revenueForecast.trend).color}`}>
                        {getTrendDisplay(revenueForecast.trend).icon}
                        <span className="text-sm">{getTrendDisplay(revenueForecast.trend).label}</span>
                      </div>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Confidence:</span>
                      <Badge variant="outline" className="ml-2">
                        {(revenueForecast.confidence * 100).toFixed(1)}%
                      </Badge>
                    </div>
                    <div>
                      <span className="text-sm font-medium">Predicted Total:</span>
                      <span className="ml-2 text-lg font-bold">
                        {formatCurrency(
                          revenueForecast.forecastData?.reduce((sum: number, item: any) => sum + item.revenue, 0) || 0,
                        )}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No forecast data available</p>
                )}
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Revenue Forecast Chart</CardTitle>
                <CardDescription>Historical data and 3-month forecast</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {loading ? (
                  <Skeleton className="h-full w-full" />
                ) : revenueForecast && revenueForecast.historicalData?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={[
                        ...revenueForecast.historicalData.map((item: any) => ({
                          ...item,
                          type: "historical",
                        })),
                        ...revenueForecast.forecastData.map((item: any) => ({
                          ...item,
                          type: "forecast",
                        })),
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `$${value}`} />
                      <Tooltip formatter={(value) => [formatCurrency(Number(value)), "Revenue"]} />
                      <Line
                        type="monotone"
                        dataKey="revenue"
                        stroke="#00AE98"
                        strokeWidth={2}
                        strokeDasharray={(entry: any) => (entry?.type === "forecast" ? "5 5" : "0")}
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
          </div>
        </TabsContent>

        <TabsContent value="churn" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Churn Prediction</CardTitle>
              <CardDescription>Identify customers at risk of churning</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <div className="text-center space-y-2">
                  <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto" />
                  <p className="text-muted-foreground">Churn prediction requires individual customer analysis</p>
                  <p className="text-sm text-muted-foreground">
                    Use the customer segmentation tab to identify at-risk customers
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
