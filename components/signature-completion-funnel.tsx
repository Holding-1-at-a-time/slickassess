"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { TrendingDown, TrendingUp, Users, FileText, Eye, Edit, CheckCircle } from "lucide-react"

interface SignatureCompletionFunnelProps {
  orgId: string
  startDate?: number
  endDate?: number
}

export function SignatureCompletionFunnel({ orgId, startDate, endDate }: SignatureCompletionFunnelProps) {
  const funnelData = useQuery(api.signatures.getSignatureCompletionFunnel, {
    orgId,
    startDate,
    endDate,
  })

  if (!funnelData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Signature Completion Funnel</CardTitle>
          <CardDescription>Track the customer journey from report generation to signature completion</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
  }

  const funnelSteps = [
    {
      name: "Reports Generated",
      value: funnelData.reportsGenerated,
      icon: FileText,
      color: "bg-blue-500",
      percentage: 100,
    },
    {
      name: "Signatures Sent",
      value: funnelData.signaturesSent,
      icon: Users,
      color: "bg-indigo-500",
      percentage: funnelData.reportsGenerated > 0 ? (funnelData.signaturesSent / funnelData.reportsGenerated) * 100 : 0,
    },
    {
      name: "Signatures Viewed",
      value: funnelData.signaturesViewed,
      icon: Eye,
      color: "bg-purple-500",
      percentage: funnelData.signaturesSent > 0 ? (funnelData.signaturesViewed / funnelData.signaturesSent) * 100 : 0,
    },
    {
      name: "Signatures Started",
      value: funnelData.signaturesStarted,
      icon: Edit,
      color: "bg-pink-500",
      percentage:
        funnelData.signaturesViewed > 0 ? (funnelData.signaturesStarted / funnelData.signaturesViewed) * 100 : 0,
    },
    {
      name: "Signatures Completed",
      value: funnelData.signaturesCompleted,
      icon: CheckCircle,
      color: "bg-green-500",
      percentage:
        funnelData.signaturesStarted > 0 ? (funnelData.signaturesCompleted / funnelData.signaturesStarted) * 100 : 0,
    },
  ]

  const getConversionRate = (current: number, previous: number) => {
    if (previous === 0) return 0
    return ((current / previous) * 100).toFixed(1)
  }

  const getConversionTrend = (rate: number) => {
    // Mock trend calculation - in real app, compare with previous period
    const trend = Math.random() > 0.5 ? "up" : "down"
    const change = Math.random() * 10

    return {
      trend,
      change: change.toFixed(1),
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Signature Completion Funnel</CardTitle>
        <CardDescription>Track the customer journey from report generation to signature completion</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {funnelSteps.map((step, index) => {
            const Icon = step.icon
            const isLast = index === funnelSteps.length - 1
            const conversionRate = index > 0 ? getConversionRate(step.value, funnelSteps[index - 1].value) : "100.0"
            const trend = getConversionTrend(Number.parseFloat(conversionRate))

            return (
              <div key={step.name} className="relative">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`flex h-10 w-10 items-center justify-center rounded-full ${step.color} text-white`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-medium">{step.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {step.value.toLocaleString()} {index > 0 && `(${conversionRate}% conversion)`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    {index > 0 && (
                      <Badge variant={trend.trend === "up" ? "default" : "secondary"} className="text-xs">
                        {trend.trend === "up" ? (
                          <TrendingUp className="h-3 w-3 mr-1" />
                        ) : (
                          <TrendingDown className="h-3 w-3 mr-1" />
                        )}
                        {trend.change}%
                      </Badge>
                    )}
                    <span className="text-2xl font-bold">{step.value.toLocaleString()}</span>
                  </div>
                </div>
                <Progress value={step.percentage} className="h-2" />
                {!isLast && <div className="absolute left-5 top-12 w-0.5 h-6 bg-gray-200 dark:bg-gray-700"></div>}
              </div>
            )
          })}
        </div>

        {/* Summary Statistics */}
        <div className="mt-8 pt-6 border-t">
          <h4 className="font-medium mb-4">Conversion Summary</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-600">{funnelData.conversionRates.sentToViewed.toFixed(1)}%</p>
              <p className="text-sm text-muted-foreground">Sent → Viewed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {funnelData.conversionRates.viewedToStarted.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Viewed → Started</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {funnelData.conversionRates.startedToCompleted.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Started → Completed</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-primary">
                {funnelData.conversionRates.overallConversion.toFixed(1)}%
              </p>
              <p className="text-sm text-muted-foreground">Overall Conversion</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
