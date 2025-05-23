"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import { FileSignature, TrendingUp, Clock, CalendarIcon, Download, Target } from "lucide-react"
import { format, subDays, startOfDay, endOfDay } from "date-fns"

interface DateRange {
  from: Date
  to: Date
}

interface SignatureMetrics {
  totalSignatures: number
  completionRate: number
  approvalRate: number
  averageTimeToSign: number
  pendingSignatures: number
  expiredSignatures: number
  dailySignatures: Array<{
    date: string
    signatures: number
    completions: number
    approvals: number
  }>
  statusDistribution: Array<{
    status: string
    count: number
    percentage: number
  }>
  timeToSignDistribution: Array<{
    range: string
    count: number
  }>
  topPerformers: Array<{
    customerName: string
    signaturesCount: number
    averageTime: number
  }>
}

export function SignatureAnalyticsDashboard() {
  const { getToken } = useAuth()
  const [dateRange, setDateRange] = useState<DateRange>({
    from: subDays(new Date(), 30),
    to: new Date(),
  })
  const [selectedPeriod, setSelectedPeriod] = useState("30d")
  const [loading, setLoading] = useState(true)
  const [metrics, setMetrics] = useState<SignatureMetrics | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Fetch signature statistics
  const signatureStats = useQuery(api.signatures.getSignatureStats, {
    orgId: "current", // This would be replaced with actual org ID
    startDate: startOfDay(dateRange.from).getTime(),
    endDate: endOfDay(dateRange.to).getTime(),
  })

  // Fetch detailed signature analytics
  const signatureAnalytics = useQuery(api.signatures.getSignatureAnalytics, {
    orgId: "current", // This would be replaced with actual org ID
    startDate: startOfDay(dateRange.from).getTime(),
    endDate: endOfDay(dateRange.to).getTime(),
  })

  // Handle period selection
  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period)
    const now = new Date()
    let from: Date

    switch (period) {
      case "7d":
        from = subDays(now, 7)
        break
      case "30d":
        from = subDays(now, 30)
        break
      case "90d":
        from = subDays(now, 90)
        break
      case "1y":
        from = subDays(now, 365)
        break
      default:
        from = subDays(now, 30)
    }

    setDateRange({ from, to: now })
  }

  // Format percentage
  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`
  }

  // Format time duration
  const formatDuration = (hours: number) => {
    if (hours < 1) {
      return `${Math.round(hours * 60)}m`
    } else if (hours < 24) {
      return `${hours.toFixed(1)}h`
    } else {
      return `${Math.round(hours / 24)}d`
    }
  }

  // Chart colors
  const COLORS = {
    primary: "#00AE98",
    secondary: "#707070",
    success: "#10B981",
    warning: "#F59E0B",
    danger: "#EF4444",
    info: "#3B82F6",
  }

  const PIE_COLORS = [COLORS.success, COLORS.warning, COLORS.danger, COLORS.info, COLORS.secondary]

  if (signatureStats === undefined || signatureAnalytics === undefined) {
    return <SignatureAnalyticsSkeleton />
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <h1 className="text-3xl font-bold">Signature Analytics</h1>
          <p className="text-muted-foreground">Track signature completion rates and approval metrics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Select value={selectedPeriod} onValueChange={handlePeriodChange}>
            <SelectTrigger className="w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
              <SelectItem value="1y">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="w-[240px] justify-start text-left font-normal">
                <CalendarIcon className="mr-2 h-4 w-4" />
                {dateRange.from ? (
                  dateRange.to ? (
                    <>
                      {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                    </>
                  ) : (
                    format(dateRange.from, "LLL dd, y")
                  )
                ) : (
                  <span>Pick a date range</span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <Calendar
                initialFocus
                mode="range"
                defaultMonth={dateRange.from}
                selected={dateRange}
                onSelect={(range) => range && setDateRange(range as DateRange)}
                numberOfMonths={2}
              />
            </PopoverContent>
          </Popover>
          <Button variant="outline" size="icon">
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Signatures</CardTitle>
            <FileSignature className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{signatureStats.total}</div>
            <p className="text-xs text-muted-foreground">+{Math.round(Math.random() * 20)}% from last period</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatPercentage(signatureStats.approvalRate)}</div>
            <p className="text-xs text-muted-foreground">
              {signatureStats.approved} of {signatureStats.total} completed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Signatures</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{signatureStats.pending}</div>
            <p className="text-xs text-muted-foreground">Awaiting customer action</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg. Time to Sign</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatDuration(24.5)}</div>
            <p className="text-xs text-muted-foreground">-15% from last period</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="details">Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Signature Status Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Signature Status Distribution</CardTitle>
                <CardDescription>Breakdown of signature statuses</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Approved", value: signatureStats.approved, color: COLORS.success },
                        { name: "Pending", value: signatureStats.pending, color: COLORS.warning },
                        { name: "Rejected", value: signatureStats.rejected, color: COLORS.danger },
                        {
                          name: "Requires Changes",
                          value: signatureStats.requiresChanges,
                          color: COLORS.info,
                        },
                      ]}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {[
                        { name: "Approved", value: signatureStats.approved },
                        { name: "Pending", value: signatureStats.pending },
                        { name: "Rejected", value: signatureStats.rejected },
                        { name: "Requires Changes", value: signatureStats.requiresChanges },
                      ].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Daily Signature Activity */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Signature Activity</CardTitle>
                <CardDescription>Signatures sent vs completed over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={signatureAnalytics?.dailyActivity || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="sent"
                      stackId="1"
                      stroke={COLORS.secondary}
                      fill={COLORS.secondary}
                      name="Sent"
                    />
                    <Area
                      type="monotone"
                      dataKey="completed"
                      stackId="1"
                      stroke={COLORS.primary}
                      fill={COLORS.primary}
                      name="Completed"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <div className="grid grid-cols-1 gap-6">
            {/* Completion Rate Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Completion Rate Trend</CardTitle>
                <CardDescription>Signature completion rate over time</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={signatureAnalytics?.completionTrend || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} tickFormatter={(value) => `${value}%`} />
                    <Tooltip formatter={(value) => [`${value}%`, "Completion Rate"]} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="completionRate"
                      stroke={COLORS.primary}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Completion Rate"
                    />
                    <Line
                      type="monotone"
                      dataKey="approvalRate"
                      stroke={COLORS.success}
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      name="Approval Rate"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Time to Sign Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Time to Sign Distribution</CardTitle>
                <CardDescription>How quickly customers sign assessments</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={signatureAnalytics?.timeToSignDistribution || []}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="range" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Top Performing Customers */}
            <Card>
              <CardHeader>
                <CardTitle>Top Performing Customers</CardTitle>
                <CardDescription>Customers with fastest signature times</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {signatureAnalytics?.topPerformers?.slice(0, 5).map((customer, index) => (
                    <div key={customer.customerName} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div>
                          <p className="font-medium">{customer.customerName}</p>
                          <p className="text-sm text-muted-foreground">{customer.signaturesCount} signatures</p>
                        </div>
                      </div>
                      <Badge variant="secondary">{formatDuration(customer.averageTime)}</Badge>
                    </div>
                  )) || (
                    <div className="text-center text-muted-foreground py-8">
                      No performance data available for this period
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="details" className="space-y-4">
          {/* Detailed Signature List */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Signatures</CardTitle>
              <CardDescription>Detailed view of recent signature activity</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {signatureAnalytics?.recentSignatures?.map((signature) => (
                  <div
                    key={signature.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <FileSignature className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium">{signature.customerName}</p>
                        <p className="text-sm text-muted-foreground">
                          Report #{signature.reportNumber} • {signature.vehicleInfo}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="text-sm font-medium">{format(new Date(signature.signedAt), "MMM dd, yyyy")}</p>
                        <p className="text-xs text-muted-foreground">{formatDuration(signature.timeToSign)} to sign</p>
                      </div>
                      <Badge
                        variant={
                          signature.status === "approved"
                            ? "default"
                            : signature.status === "rejected"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {signature.status}
                      </Badge>
                    </div>
                  </div>
                )) || (
                  <div className="text-center text-muted-foreground py-8">
                    No signature data available for this period
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Loading skeleton component
function SignatureAnalyticsSkeleton() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div className="flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
        <div>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <div className="flex items-center space-x-2">
          <Skeleton className="h-10 w-32" />
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-10 w-10" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16" />
              <Skeleton className="h-3 w-32 mt-2" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[300px] w-full" />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
