"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"

interface CustomerSegmentationProps {
  orgId: string
}

export function CustomerSegmentation({ orgId }: CustomerSegmentationProps) {
  const { getToken } = useAuth()
  const [loading, setLoading] = useState(true)
  const [distribution, setDistribution] = useState<any[]>([])
  const [selectedSegment, setSelectedSegment] = useState<string | null>(null)
  const [segmentCustomers, setSegmentCustomers] = useState<any[]>([])
  const [loadingSegment, setLoadingSegment] = useState(false)

  // Format currency for display
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  // Fetch segment distribution
  useEffect(() => {
    async function fetchDistribution() {
      try {
        setLoading(true)

        // Get JWT token for authentication
        const token = await getToken({ template: "convex" })

        // Fetch segment distribution
        const response = await fetch(`/api/analytics/segments?action=distribution`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch segment distribution")
        }

        const data = await response.json()
        setDistribution(data)
      } catch (error) {
        console.error("Error fetching segment distribution:", error)
      } finally {
        setLoading(false)
      }
    }

    if (orgId) {
      fetchDistribution()
    }
  }, [getToken, orgId])

  // Fetch customers in segment
  const fetchSegmentCustomers = async (segment: string) => {
    try {
      setLoadingSegment(true)
      setSelectedSegment(segment)

      // Get JWT token for authentication
      const token = await getToken({ template: "convex" })

      // Fetch customers in segment
      const response = await fetch(`/api/analytics/segments?action=segment&segment=${segment}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (!response.ok) {
        throw new Error("Failed to fetch segment customers")
      }

      const data = await response.json()
      setSegmentCustomers(data)
    } catch (error) {
      console.error("Error fetching segment customers:", error)
    } finally {
      setLoadingSegment(false)
    }
  }

  // Get segment label
  const getSegmentLabel = (segment: string) => {
    const segmentItem = distribution.find((item) => item.segment === segment)
    return segmentItem?.label || segment
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Customer Segmentation</h2>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="segments">Segment Details</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Customer Segment Distribution</CardTitle>
              <CardDescription>Breakdown of your customer base by segment</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px]">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Skeleton className="h-full w-full" />
                </div>
              ) : distribution.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribution}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      outerRadius={120}
                      fill="#8884d8"
                      dataKey="count"
                      nameKey="label"
                      label={({ label, percent }) => `${label}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {distribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [`${value} customers`, "Count"]} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No segment data available</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Segment Breakdown</CardTitle>
              <CardDescription>Click on a segment to view customers</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : distribution.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {distribution.map((segment) => (
                    <Card key={segment.segment} className="overflow-hidden">
                      <div className="h-1" style={{ backgroundColor: segment.color }} />
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium">{segment.label}</h3>
                            <p className="text-sm text-muted-foreground">{segment.count} customers</p>
                          </div>
                          <Button variant="ghost" size="sm" onClick={() => fetchSegmentCustomers(segment.segment)}>
                            View <ChevronRight className="ml-1 h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-4">No segment data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="segments" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>
                    {selectedSegment ? `${getSegmentLabel(selectedSegment)} Segment` : "Select a Segment"}
                  </CardTitle>
                  <CardDescription>
                    {selectedSegment
                      ? `${segmentCustomers.length} customers in this segment`
                      : "Click on a segment in the Overview tab to view customers"}
                  </CardDescription>
                </div>
                {selectedSegment && (
                  <Badge
                    style={{
                      backgroundColor: distribution.find((s) => s.segment === selectedSegment)?.color || "#000",
                      color: "#fff",
                    }}
                  >
                    {getSegmentLabel(selectedSegment)}
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {loadingSegment ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : selectedSegment ? (
                segmentCustomers.length > 0 ? (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Customer</TableHead>
                          <TableHead>Contact</TableHead>
                          <TableHead>Total Spend</TableHead>
                          <TableHead>Visits</TableHead>
                          <TableHead>Last Visit</TableHead>
                          <TableHead>Customer Since</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {segmentCustomers.map((customer) => (
                          <TableRow key={customer.clientId}>
                            <TableCell className="font-medium">{customer.name}</TableCell>
                            <TableCell>
                              {customer.email}
                              {customer.email && customer.phone && <br />}
                              {customer.phone}
                            </TableCell>
                            <TableCell>{formatCurrency(customer.metrics.totalSpend)}</TableCell>
                            <TableCell>{customer.metrics.visitCount}</TableCell>
                            <TableCell>
                              {customer.metrics.daysSinceLastVisit === 0
                                ? "Today"
                                : `${customer.metrics.daysSinceLastVisit} days ago`}
                            </TableCell>
                            <TableCell>
                              {customer.metrics.daysAsCustomer === 0
                                ? "Today"
                                : `${customer.metrics.daysAsCustomer} days`}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center text-muted-foreground py-4">No customers in this segment</p>
                )
              ) : (
                <p className="text-center text-muted-foreground py-4">Select a segment to view customers</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
