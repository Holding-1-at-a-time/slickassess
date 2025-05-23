import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getBigQueryClient } from "@/lib/analytics/bigquery"
import { forecastAppointments, forecastRevenue, predictCustomerChurn } from "@/lib/analytics/predictive-analytics"
import { getSegmentDistribution } from "@/lib/analytics/customer-segmentation"
import { ConvexHttpClient } from "convex/http"
import { api } from "@/convex/_generated/api"

// Initialize Convex client
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || ""
const convexAdminKey = process.env.CONVEX_ADMIN_KEY || ""
const convexClient = new ConvexHttpClient(convexUrl, convexAdminKey)

// Rate limiting helper
const rateLimitMap = new Map<string, { count: number; resetTime: number }>()

function checkRateLimit(identifier: string, limit = 100, windowMs = 60000): boolean {
  const now = Date.now()
  const userLimit = rateLimitMap.get(identifier)

  if (!userLimit || now > userLimit.resetTime) {
    rateLimitMap.set(identifier, { count: 1, resetTime: now + windowMs })
    return true
  }

  if (userLimit.count >= limit) {
    return false
  }

  userLimit.count++
  return true
}

// GET endpoint for analytics data
export async function GET(request: Request) {
  try {
    // Authenticate the request
    const { userId, orgId } = auth()
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })
    if (!orgId) return new NextResponse("No organization selected", { status: 400 })

    // Rate limiting
    if (!checkRateLimit(`${orgId}:${userId}`)) {
      return new NextResponse("Rate limit exceeded", { status: 429 })
    }

    // Parse query parameters
    const url = new URL(request.url)
    const endpoint = url.searchParams.get("endpoint")
    const startDate = url.searchParams.get("startDate")
    const endDate = url.searchParams.get("endDate")
    const granularity = url.searchParams.get("granularity") || "day"
    const metrics = url.searchParams.get("metrics")?.split(",") || []

    // Validate date range
    const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const end = endDate ? new Date(endDate) : new Date()

    if (start > end) {
      return new NextResponse("Invalid date range", { status: 400 })
    }

    const client = getBigQueryClient()

    switch (endpoint) {
      case "overview":
        return await getOverviewMetrics(orgId, start, end, client)

      case "revenue":
        return await getRevenueAnalytics(orgId, start, end, granularity, client)

      case "appointments":
        return await getAppointmentAnalytics(orgId, start, end, granularity, client)

      case "customers":
        return await getCustomerAnalytics(orgId, start, end, client)

      case "performance":
        return await getPerformanceMetrics(orgId, start, end, client)

      case "trends":
        return await getTrendAnalytics(orgId, start, end, granularity, client)

      case "segments":
        return await getSegmentAnalytics(orgId)

      case "predictive":
        const type = url.searchParams.get("type") || "appointments"
        return await getPredictiveAnalytics(orgId, type, url.searchParams)

      case "real-time":
        return await getRealTimeAnalytics(orgId)

      default:
        return new NextResponse("Invalid endpoint", { status: 400 })
    }
  } catch (error) {
    console.error("Error in analytics API:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

// Overview metrics
async function getOverviewMetrics(orgId: string, start: Date, end: Date, client: any) {
  const query = `
    WITH metrics AS (
      SELECT
        COUNT(DISTINCT CASE WHEN eventType = 'appointment_created' THEN timestamp END) as total_appointments,
        COUNT(DISTINCT CASE WHEN eventType = 'assessment_completed' THEN timestamp END) as total_assessments,
        COUNT(DISTINCT CASE WHEN eventType = 'client_created' THEN timestamp END) as new_clients,
        SUM(CASE WHEN eventType = 'payment_received' THEN CAST(JSON_EXTRACT_SCALAR(eventData, '$.amount') AS FLOAT64) ELSE 0 END) as total_revenue,
        COUNT(DISTINCT userId) as active_users
      FROM
        \`slickassess_dataset.analytics_events\`
      WHERE
        orgId = @orgId
        AND timestamp BETWEEN @startDate AND @endDate
    ),
    previous_metrics AS (
      SELECT
        COUNT(DISTINCT CASE WHEN eventType = 'appointment_created' THEN timestamp END) as prev_appointments,
        COUNT(DISTINCT CASE WHEN eventType = 'assessment_completed' THEN timestamp END) as prev_assessments,
        COUNT(DISTINCT CASE WHEN eventType = 'client_created' THEN timestamp END) as prev_clients,
        SUM(CASE WHEN eventType = 'payment_received' THEN CAST(JSON_EXTRACT_SCALAR(eventData, '$.amount') AS FLOAT64) ELSE 0 END) as prev_revenue
      FROM
        \`slickassess_dataset.analytics_events\`
      WHERE
        orgId = @orgId
        AND timestamp BETWEEN @prevStartDate AND @prevEndDate
    )
    SELECT
      m.*,
      pm.prev_appointments,
      pm.prev_assessments,
      pm.prev_clients,
      pm.prev_revenue
    FROM metrics m
    CROSS JOIN previous_metrics pm
  `

  const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  const prevStart = new Date(start.getTime() - daysDiff * 24 * 60 * 60 * 1000)
  const prevEnd = new Date(start.getTime())

  const [rows] = await client.query({
    query,
    params: {
      orgId,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      prevStartDate: prevStart.toISOString(),
      prevEndDate: prevEnd.toISOString(),
    },
  })

  const data = rows[0] || {}

  const calculateChange = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0
    return ((current - previous) / previous) * 100
  }

  return NextResponse.json({
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    metrics: {
      appointments: {
        total: data.total_appointments || 0,
        change: calculateChange(data.total_appointments || 0, data.prev_appointments || 0),
      },
      assessments: {
        total: data.total_assessments || 0,
        change: calculateChange(data.total_assessments || 0, data.prev_assessments || 0),
      },
      clients: {
        total: data.new_clients || 0,
        change: calculateChange(data.new_clients || 0, data.prev_clients || 0),
      },
      revenue: {
        total: data.total_revenue || 0,
        change: calculateChange(data.total_revenue || 0, data.prev_revenue || 0),
      },
      activeUsers: data.active_users || 0,
    },
  })
}

// Revenue analytics
async function getRevenueAnalytics(orgId: string, start: Date, end: Date, granularity: string, client: any) {
  const dateFormat = granularity === "month" ? "%Y-%m" : granularity === "week" ? "%Y-%U" : "%Y-%m-%d"

  const query = `
    SELECT
      FORMAT_TIMESTAMP('${dateFormat}', timestamp) as period,
      SUM(CAST(JSON_EXTRACT_SCALAR(eventData, '$.amount') AS FLOAT64)) as revenue,
      COUNT(*) as transaction_count,
      AVG(CAST(JSON_EXTRACT_SCALAR(eventData, '$.amount') AS FLOAT64)) as avg_transaction
    FROM
      \`slickassess_dataset.analytics_events\`
    WHERE
      orgId = @orgId
      AND eventType = 'payment_received'
      AND timestamp BETWEEN @startDate AND @endDate
    GROUP BY
      period
    ORDER BY
      period ASC
  `

  const [rows] = await client.query({
    query,
    params: {
      orgId,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
  })

  return NextResponse.json({
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
      granularity,
    },
    data: rows.map((row: any) => ({
      period: row.period,
      revenue: row.revenue || 0,
      transactionCount: row.transaction_count || 0,
      avgTransaction: row.avg_transaction || 0,
    })),
  })
}

// Appointment analytics
async function getAppointmentAnalytics(orgId: string, start: Date, end: Date, granularity: string, client: any) {
  const dateFormat = granularity === "month" ? "%Y-%m" : granularity === "week" ? "%Y-%U" : "%Y-%m-%d"

  const query = `
    SELECT
      FORMAT_TIMESTAMP('${dateFormat}', timestamp) as period,
      COUNT(CASE WHEN eventType = 'appointment_created' THEN 1 END) as created,
      COUNT(CASE WHEN eventType = 'appointment_completed' THEN 1 END) as completed,
      COUNT(CASE WHEN eventType = 'appointment_cancelled' THEN 1 END) as cancelled,
      COUNT(CASE WHEN eventType = 'appointment_rescheduled' THEN 1 END) as rescheduled
    FROM
      \`slickassess_dataset.analytics_events\`
    WHERE
      orgId = @orgId
      AND eventType IN ('appointment_created', 'appointment_completed', 'appointment_cancelled', 'appointment_rescheduled')
      AND timestamp BETWEEN @startDate AND @endDate
    GROUP BY
      period
    ORDER BY
      period ASC
  `

  const [rows] = await client.query({
    query,
    params: {
      orgId,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
  })

  return NextResponse.json({
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
      granularity,
    },
    data: rows.map((row: any) => ({
      period: row.period,
      created: row.created || 0,
      completed: row.completed || 0,
      cancelled: row.cancelled || 0,
      rescheduled: row.rescheduled || 0,
      completionRate: row.created > 0 ? (row.completed / row.created) * 100 : 0,
    })),
  })
}

// Customer analytics
async function getCustomerAnalytics(orgId: string, start: Date, end: Date, client: any) {
  const query = `
    WITH customer_metrics AS (
      SELECT
        JSON_EXTRACT_SCALAR(eventData, '$.clientId') as client_id,
        COUNT(*) as interaction_count,
        SUM(CASE WHEN eventType = 'payment_received' THEN CAST(JSON_EXTRACT_SCALAR(eventData, '$.amount') AS FLOAT64) ELSE 0 END) as total_spent,
        MIN(timestamp) as first_interaction,
        MAX(timestamp) as last_interaction
      FROM
        \`slickassess_dataset.analytics_events\`
      WHERE
        orgId = @orgId
        AND JSON_EXTRACT_SCALAR(eventData, '$.clientId') IS NOT NULL
        AND timestamp BETWEEN @startDate AND @endDate
      GROUP BY
        client_id
    )
    SELECT
      COUNT(*) as total_customers,
      AVG(interaction_count) as avg_interactions_per_customer,
      AVG(total_spent) as avg_spent_per_customer,
      SUM(total_spent) as total_customer_value,
      COUNT(CASE WHEN interaction_count = 1 THEN 1 END) as one_time_customers,
      COUNT(CASE WHEN interaction_count > 1 THEN 1 END) as repeat_customers
    FROM
      customer_metrics
  `

  const [rows] = await client.query({
    query,
    params: {
      orgId,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
  })

  const data = rows[0] || {}

  return NextResponse.json({
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    metrics: {
      totalCustomers: data.total_customers || 0,
      avgInteractionsPerCustomer: data.avg_interactions_per_customer || 0,
      avgSpentPerCustomer: data.avg_spent_per_customer || 0,
      totalCustomerValue: data.total_customer_value || 0,
      oneTimeCustomers: data.one_time_customers || 0,
      repeatCustomers: data.repeat_customers || 0,
      repeatRate: data.total_customers > 0 ? (data.repeat_customers / data.total_customers) * 100 : 0,
    },
  })
}

// Performance metrics
async function getPerformanceMetrics(orgId: string, start: Date, end: Date, client: any) {
  const query = `
    WITH performance_data AS (
      SELECT
        userId,
        COUNT(CASE WHEN eventType = 'assessment_completed' THEN 1 END) as assessments_completed,
        COUNT(CASE WHEN eventType = 'appointment_created' THEN 1 END) as appointments_created,
        SUM(CASE WHEN eventType = 'payment_received' THEN CAST(JSON_EXTRACT_SCALAR(eventData, '$.amount') AS FLOAT64) ELSE 0 END) as revenue_generated,
        AVG(CASE WHEN eventType = 'assessment_completed' THEN 
          CAST(JSON_EXTRACT_SCALAR(eventData, '$.duration_minutes') AS INT64) END) as avg_assessment_duration
      FROM
        \`slickassess_dataset.analytics_events\`
      WHERE
        orgId = @orgId
        AND userId IS NOT NULL
        AND timestamp BETWEEN @startDate AND @endDate
      GROUP BY
        userId
    )
    SELECT
      COUNT(*) as active_staff,
      AVG(assessments_completed) as avg_assessments_per_staff,
      AVG(appointments_created) as avg_appointments_per_staff,
      AVG(revenue_generated) as avg_revenue_per_staff,
      AVG(avg_assessment_duration) as avg_assessment_duration_minutes,
      SUM(assessments_completed) as total_assessments,
      SUM(revenue_generated) as total_revenue
    FROM
      performance_data
  `

  const [rows] = await client.query({
    query,
    params: {
      orgId,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
  })

  const data = rows[0] || {}

  return NextResponse.json({
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    metrics: {
      activeStaff: data.active_staff || 0,
      avgAssessmentsPerStaff: data.avg_assessments_per_staff || 0,
      avgAppointmentsPerStaff: data.avg_appointments_per_staff || 0,
      avgRevenuePerStaff: data.avg_revenue_per_staff || 0,
      avgAssessmentDuration: data.avg_assessment_duration_minutes || 0,
      totalAssessments: data.total_assessments || 0,
      totalRevenue: data.total_revenue || 0,
      efficiency: data.avg_assessment_duration_minutes > 0 ? 60 / data.avg_assessment_duration_minutes : 0,
    },
  })
}

// Trend analytics
async function getTrendAnalytics(orgId: string, start: Date, end: Date, granularity: string, client: any) {
  const dateFormat = granularity === "month" ? "%Y-%m" : granularity === "week" ? "%Y-%U" : "%Y-%m-%d"

  const query = `
    SELECT
      FORMAT_TIMESTAMP('${dateFormat}', timestamp) as period,
      eventType,
      COUNT(*) as event_count
    FROM
      \`slickassess_dataset.analytics_events\`
    WHERE
      orgId = @orgId
      AND timestamp BETWEEN @startDate AND @endDate
    GROUP BY
      period, eventType
    ORDER BY
      period ASC, eventType ASC
  `

  const [rows] = await client.query({
    query,
    params: {
      orgId,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
    },
  })

  // Group by period
  const trendData: Record<string, Record<string, number>> = {}

  for (const row of rows) {
    if (!trendData[row.period]) {
      trendData[row.period] = {}
    }
    trendData[row.period][row.eventType] = row.event_count
  }

  return NextResponse.json({
    period: {
      start: start.toISOString(),
      end: end.toISOString(),
      granularity,
    },
    data: Object.entries(trendData).map(([period, events]) => ({
      period,
      events,
    })),
  })
}

// Segment analytics
async function getSegmentAnalytics(orgId: string) {
  const distribution = await getSegmentDistribution(orgId)

  return NextResponse.json({
    segments: distribution,
    totalCustomers: distribution.reduce((sum, segment) => sum + segment.count, 0),
  })
}

// Predictive analytics
async function getPredictiveAnalytics(orgId: string, type: string, searchParams: URLSearchParams) {
  switch (type) {
    case "appointments":
      const days = Number.parseInt(searchParams.get("days") || "30", 10)
      const forecastDays = Number.parseInt(searchParams.get("forecastDays") || "14", 10)
      const appointmentForecast = await forecastAppointments(orgId, days, forecastDays)
      return NextResponse.json(appointmentForecast)

    case "revenue":
      const months = Number.parseInt(searchParams.get("months") || "12", 10)
      const forecastMonths = Number.parseInt(searchParams.get("forecastMonths") || "3", 10)
      const revenueForecast = await forecastRevenue(orgId, months, forecastMonths)
      return NextResponse.json(revenueForecast)

    case "churn":
      const clientId = searchParams.get("clientId")
      if (!clientId) {
        return new NextResponse("Client ID is required for churn prediction", { status: 400 })
      }
      const churnPrediction = await predictCustomerChurn(orgId, clientId)
      return NextResponse.json(churnPrediction)

    default:
      return new NextResponse("Invalid prediction type", { status: 400 })
  }
}

// Real-time analytics
async function getRealTimeAnalytics(orgId: string) {
  try {
    // Get real-time metrics from Convex
    const metrics = await convexClient.query(api.realTimeAnalytics.getRealTimeMetrics, { orgId })
    const activityFeed = await convexClient.query(api.realTimeAnalytics.getActivityFeed, { orgId, limit: 20 })

    return NextResponse.json({
      metrics,
      activityFeed,
      lastUpdated: Date.now(),
    })
  } catch (error) {
    console.error("Error getting real-time analytics:", error)
    return new NextResponse("Error getting real-time analytics", { status: 500 })
  }
}

// POST endpoint for tracking events
export async function POST(request: Request) {
  try {
    // Authenticate the request
    const { userId, orgId } = auth()
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })
    if (!orgId) return new NextResponse("No organization selected", { status: 400 })

    // Rate limiting
    if (!checkRateLimit(`${orgId}:${userId}:post`, 50)) {
      return new NextResponse("Rate limit exceeded", { status: 429 })
    }

    // Parse request body
    const body = await request.json()
    const { eventType, eventData } = body

    if (!eventType) {
      return new NextResponse("Event type is required", { status: 400 })
    }

    // Track event in real-time analytics
    await convexClient.mutation(api.realTimeAnalytics.trackEvent, {
      orgId,
      eventType,
      eventData: eventData || {},
      userId,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error tracking event:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
