import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { getBigQueryClient } from "@/lib/analytics/bigquery"
import { forecastAppointments, forecastRevenue, predictCustomerChurn } from "@/lib/analytics/predictive-analytics"
import {
  getSegmentDistribution,
  getCustomersInSegment,
  type CustomerSegment,
} from "@/lib/analytics/customer-segmentation"
import { ConvexHttpClient } from "convex/http"
import { api } from "@/convex/_generated/api"

// Initialize Convex client securely
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || ""
const convexClient = new ConvexHttpClient(convexUrl)

// For admin operations, use a function that requires authentication
async function performAdminOperation(operation: string, params: any) {
  // This ensures admin operations are only performed by authenticated users with proper permissions
  const { userId, orgId, orgRole } = auth()
  if (!userId || !orgId || (orgRole !== "admin" && orgRole !== "org:admin")) {
    throw new Error("Unauthorized admin operation")
  }

  // Now perform the operation through Convex with proper authentication
  return await convexClient.query(operation, params)
}

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

    // Parse and validate query parameters
    const url = new URL(request.url)

    // Validate endpoint parameter
    const validEndpoints = [
      "overview",
      "revenue",
      "appointments",
      "customers",
      "segments",
      "predictions",
      "real-time",
      "performance",
    ]
    const endpoint = url.searchParams.get("endpoint")
    if (!endpoint || !validEndpoints.includes(endpoint)) {
      return NextResponse.json(
        {
          error: "Invalid or missing endpoint parameter",
          availableEndpoints: validEndpoints,
        },
        { status: 400 },
      )
    }

    // Validate format parameter
    const validFormats = ["json", "csv"]
    const format = url.searchParams.get("format") || "json"
    if (!validFormats.includes(format)) {
      return NextResponse.json(
        {
          error: "Invalid format parameter",
          availableFormats: validFormats,
        },
        { status: 400 },
      )
    }

    // Validate date parameters if present
    const startDateParam = url.searchParams.get("startDate")
    const endDateParam = url.searchParams.get("endDate")

    let startDate: number | undefined
    let endDate: number | undefined

    if (startDateParam) {
      const parsedStartDate = Date.parse(startDateParam)
      if (isNaN(parsedStartDate)) {
        return NextResponse.json(
          {
            error: "Invalid startDate format. Use ISO format (YYYY-MM-DD)",
          },
          { status: 400 },
        )
      }
      startDate = parsedStartDate
    }

    if (endDateParam) {
      const parsedEndDate = Date.parse(endDateParam)
      if (isNaN(parsedEndDate)) {
        return NextResponse.json(
          {
            error: "Invalid endDate format. Use ISO format (YYYY-MM-DD)",
          },
          { status: 400 },
        )
      }
      endDate = parsedEndDate
    }

    // Validate days parameter if present
    const daysParam = url.searchParams.get("days")
    let days: number | undefined

    if (daysParam) {
      days = Number.parseInt(daysParam, 10)
      if (isNaN(days) || days <= 0 || days > 365) {
        return NextResponse.json(
          {
            error: "Invalid days parameter. Must be a positive number between 1 and 365",
          },
          { status: 400 },
        )
      }
    }

    // Create a sanitized params object for the analytics functions
    const sanitizedParams = new URLSearchParams()
    if (days) sanitizedParams.set("days", days.toString())
    if (startDate) sanitizedParams.set("startDate", startDate.toString())
    if (endDate) sanitizedParams.set("endDate", endDate.toString())

    // Copy other validated parameters
    const validParamNames = ["period", "segment", "type", "clientId", "forecastDays", "forecastMonths"]
    for (const param of validParamNames) {
      const value = url.searchParams.get(param)
      if (value) sanitizedParams.set(param, value)
    }

    let data: any = {}

    switch (endpoint) {
      case "overview":
        data = await getOverviewAnalytics(orgId, sanitizedParams)
        break

      case "revenue":
        data = await getRevenueAnalytics(orgId, sanitizedParams)
        break

      case "appointments":
        data = await getAppointmentAnalytics(orgId, sanitizedParams)
        break

      case "customers":
        data = await getCustomerAnalytics(orgId, sanitizedParams)
        break

      case "segments":
        data = await getSegmentAnalytics(orgId, sanitizedParams)
        break

      case "predictions":
        data = await getPredictiveAnalytics(orgId, sanitizedParams)
        break

      case "real-time":
        data = await getRealTimeAnalytics(orgId, sanitizedParams)
        break

      case "performance":
        data = await getPerformanceAnalytics(orgId, sanitizedParams)
        break

      default:
        return new NextResponse("Invalid endpoint", { status: 400 })
    }

    // Format response based on requested format
    if (format === "csv") {
      const csv = convertToCSV(data)
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${endpoint}-${orgId}-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      })
    }

    return NextResponse.json({
      success: true,
      endpoint,
      orgId,
      timestamp: new Date().toISOString(),
      data,
    })
  } catch (error) {
    console.error("Error in analytics API:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Internal server error",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// Overview analytics
async function getOverviewAnalytics(orgId: string, params: URLSearchParams) {
  const client = getBigQueryClient()
  const days = Number.parseInt(params.get("days") || "30", 10)

  // Get overview metrics
  const query = `
    WITH date_range AS (
      SELECT DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY) as start_date
    ),
    revenue_data AS (
      SELECT
        SUM(amount) as total_revenue,
        COUNT(DISTINCT clientId) as unique_customers,
        COUNT(*) as total_transactions,
        AVG(amount) as avg_transaction_value
      FROM
        \`slickassess_dataset.invoice_events\`
      WHERE
        orgId = @orgId
        AND DATE(timestamp) >= (SELECT start_date FROM date_range)
    ),
    appointment_data AS (
      SELECT
        COUNT(*) as total_appointments,
        COUNT(DISTINCT clientId) as appointment_customers
      FROM
        \`slickassess_dataset.appointment_events\`
      WHERE
        orgId = @orgId
        AND DATE(timestamp) >= (SELECT start_date FROM date_range)
    ),
    assessment_data AS (
      SELECT
        COUNT(*) as total_assessments,
        AVG(completion_time_minutes) as avg_completion_time
      FROM
        \`slickassess_dataset.assessment_events\`
      WHERE
        orgId = @orgId
        AND DATE(timestamp) >= (SELECT start_date FROM date_range)
        AND event_type = 'assessment_completed'
    )
    SELECT
      r.total_revenue,
      r.unique_customers,
      r.total_transactions,
      r.avg_transaction_value,
      a.total_appointments,
      a.appointment_customers,
      s.total_assessments,
      s.avg_completion_time
    FROM
      revenue_data r
    CROSS JOIN
      appointment_data a
    CROSS JOIN
      assessment_data s
  `

  const [rows] = await client.query({
    query,
    params: { orgId, days },
  })

  return rows[0] || {}
}

// Revenue analytics
async function getRevenueAnalytics(orgId: string, params: URLSearchParams) {
  const client = getBigQueryClient()
  const period = params.get("period") || "daily"
  const days = Number.parseInt(params.get("days") || "30", 10)

  let dateFormat = "DATE(timestamp)"
  if (period === "weekly") {
    dateFormat = "DATE_TRUNC(DATE(timestamp), WEEK)"
  } else if (period === "monthly") {
    dateFormat = "DATE_TRUNC(DATE(timestamp), MONTH)"
  }

  const query = `
    SELECT
      ${dateFormat} as period,
      SUM(amount) as revenue,
      COUNT(*) as transactions,
      COUNT(DISTINCT clientId) as unique_customers,
      AVG(amount) as avg_transaction_value
    FROM
      \`slickassess_dataset.invoice_events\`
    WHERE
      orgId = @orgId
      AND DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
    GROUP BY
      period
    ORDER BY
      period ASC
  `

  const [rows] = await client.query({
    query,
    params: { orgId, days },
  })

  return {
    period,
    data: rows.map((row: any) => ({
      date: row.period.value,
      revenue: row.revenue,
      transactions: row.transactions,
      uniqueCustomers: row.unique_customers,
      avgTransactionValue: row.avg_transaction_value,
    })),
  }
}

// Appointment analytics
async function getAppointmentAnalytics(orgId: string, params: URLSearchParams) {
  const client = getBigQueryClient()
  const period = params.get("period") || "daily"
  const days = Number.parseInt(params.get("days") || "30", 10)

  let dateFormat = "DATE(timestamp)"
  if (period === "weekly") {
    dateFormat = "DATE_TRUNC(DATE(timestamp), WEEK)"
  } else if (period === "monthly") {
    dateFormat = "DATE_TRUNC(DATE(timestamp), MONTH)"
  }

  const query = `
    SELECT
      ${dateFormat} as period,
      COUNT(*) as total_appointments,
      COUNT(DISTINCT clientId) as unique_customers,
      COUNTIF(status = 'completed') as completed_appointments,
      COUNTIF(status = 'cancelled') as cancelled_appointments,
      COUNTIF(status = 'no_show') as no_show_appointments
    FROM
      \`slickassess_dataset.appointment_events\`
    WHERE
      orgId = @orgId
      AND DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
    GROUP BY
      period
    ORDER BY
      period ASC
  `

  const [rows] = await client.query({
    query,
    params: { orgId, days },
  })

  return {
    period,
    data: rows.map((row: any) => ({
      date: row.period.value,
      totalAppointments: row.total_appointments,
      uniqueCustomers: row.unique_customers,
      completedAppointments: row.completed_appointments,
      cancelledAppointments: row.cancelled_appointments,
      noShowAppointments: row.no_show_appointments,
      completionRate: row.total_appointments > 0 ? (row.completed_appointments / row.total_appointments) * 100 : 0,
    })),
  }
}

// Customer analytics
async function getCustomerAnalytics(orgId: string, params: URLSearchParams) {
  const client = getBigQueryClient()
  const days = Number.parseInt(params.get("days") || "30", 10)

  const query = `
    WITH customer_metrics AS (
      SELECT
        clientId,
        COUNT(*) as total_visits,
        SUM(amount) as total_spent,
        MIN(DATE(timestamp)) as first_visit,
        MAX(DATE(timestamp)) as last_visit,
        DATE_DIFF(CURRENT_DATE(), MAX(DATE(timestamp)), DAY) as days_since_last_visit
      FROM
        \`slickassess_dataset.client_events\`
      WHERE
        orgId = @orgId
      GROUP BY
        clientId
    ),
    new_customers AS (
      SELECT
        COUNT(*) as new_customer_count
      FROM
        customer_metrics
      WHERE
        first_visit >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
    ),
    returning_customers AS (
      SELECT
        COUNT(*) as returning_customer_count
      FROM
        customer_metrics
      WHERE
        total_visits > 1
        AND last_visit >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
    ),
    at_risk_customers AS (
      SELECT
        COUNT(*) as at_risk_count
      FROM
        customer_metrics
      WHERE
        days_since_last_visit > 90
        AND total_visits > 1
    )
    SELECT
      n.new_customer_count,
      r.returning_customer_count,
      a.at_risk_count,
      (SELECT COUNT(*) FROM customer_metrics) as total_customers,
      (SELECT AVG(total_spent) FROM customer_metrics) as avg_customer_value,
      (SELECT AVG(total_visits) FROM customer_metrics) as avg_visits_per_customer
    FROM
      new_customers n
    CROSS JOIN
      returning_customers r
    CROSS JOIN
      at_risk_customers a
  `

  const [rows] = await client.query({
    query,
    params: { orgId, days },
  })

  return rows[0] || {}
}

// Segment analytics
async function getSegmentAnalytics(orgId: string, params: URLSearchParams) {
  const segment = params.get("segment") as CustomerSegment | null

  if (segment) {
    // Get customers in specific segment
    const customers = await getCustomersInSegment(orgId, segment)
    return {
      segment,
      customerCount: customers.length,
      customers: customers.slice(0, 100), // Limit to 100 for API response
    }
  } else {
    // Get segment distribution
    const distribution = await getSegmentDistribution(orgId)
    return {
      distribution,
      totalSegments: distribution.length,
      totalCustomers: distribution.reduce((sum, segment) => sum + segment.count, 0),
    }
  }
}

// Predictive analytics
async function getPredictiveAnalytics(orgId: string, params: URLSearchParams) {
  const type = params.get("type") || "appointments"
  const clientId = params.get("clientId")

  switch (type) {
    case "appointments":
      const days = Number.parseInt(params.get("days") || "30", 10)
      const forecastDays = Number.parseInt(params.get("forecastDays") || "14", 10)
      return await forecastAppointments(orgId, days, forecastDays)

    case "revenue":
      const months = Number.parseInt(params.get("months") || "12", 10)
      const forecastMonths = Number.parseInt(params.get("forecastMonths") || "3", 10)
      return await forecastRevenue(orgId, months, forecastMonths)

    case "churn":
      if (!clientId) {
        throw new Error("Client ID is required for churn prediction")
      }
      return await predictCustomerChurn(orgId, clientId)

    default:
      throw new Error("Invalid prediction type")
  }
}

// Real-time analytics
async function getRealTimeAnalytics(orgId: string, params: URLSearchParams) {
  // Get real-time metrics from Convex
  const metrics = await convexClient.query(api.realTimeAnalytics.getRealTimeMetrics, { orgId })
  const activityFeed = await convexClient.query(api.realTimeAnalytics.getActivityFeed, { orgId, limit: 20 })

  return {
    metrics,
    activityFeed,
    lastUpdated: new Date().toISOString(),
  }
}

// Performance analytics
async function getPerformanceAnalytics(orgId: string, params: URLSearchParams) {
  const client = getBigQueryClient()
  const days = Number.parseInt(params.get("days") || "30", 10)

  const query = `
    WITH performance_metrics AS (
      SELECT
        AVG(completion_time_minutes) as avg_assessment_time,
        PERCENTILE_CONT(completion_time_minutes, 0.5) OVER() as median_assessment_time,
        COUNT(*) as total_assessments,
        COUNTIF(customer_satisfaction_score >= 4) as satisfied_customers,
        COUNT(*) as total_responses,
        AVG(customer_satisfaction_score) as avg_satisfaction_score
      FROM
        \`slickassess_dataset.assessment_events\`
      WHERE
        orgId = @orgId
        AND DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
        AND event_type = 'assessment_completed'
    ),
    efficiency_metrics AS (
      SELECT
        COUNT(*) as total_appointments,
        COUNTIF(status = 'completed') as completed_appointments,
        COUNTIF(status = 'cancelled') as cancelled_appointments,
        COUNTIF(status = 'no_show') as no_show_appointments
      FROM
        \`slickassess_dataset.appointment_events\`
      WHERE
        orgId = @orgId
        AND DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
    )
    SELECT
      p.avg_assessment_time,
      p.median_assessment_time,
      p.total_assessments,
      p.satisfied_customers,
      p.total_responses,
      p.avg_satisfaction_score,
      e.total_appointments,
      e.completed_appointments,
      e.cancelled_appointments,
      e.no_show_appointments,
      SAFE_DIVIDE(e.completed_appointments, e.total_appointments) * 100 as completion_rate,
      SAFE_DIVIDE(p.satisfied_customers, p.total_responses) * 100 as satisfaction_rate
    FROM
      performance_metrics p
    CROSS JOIN
      efficiency_metrics e
  `

  const [rows] = await client.query({
    query,
    params: { orgId, days },
  })

  return rows[0] || {}
}

// Convert data to CSV format
function convertToCSV(data: any): string {
  if (!data || typeof data !== "object") {
    return "No data available"
  }

  // Handle array data
  if (Array.isArray(data)) {
    if (data.length === 0) return "No data available"

    const headers = Object.keys(data[0])
    const csvHeaders = headers.join(",")
    const csvRows = data.map((row) => headers.map((header) => JSON.stringify(row[header] || "")).join(","))

    return [csvHeaders, ...csvRows].join("\n")
  }

  // Handle object data
  const entries = Object.entries(data)
  if (entries.length === 0) return "No data available"

  const csvHeaders = "Metric,Value"
  const csvRows = entries.map(([key, value]) => `${JSON.stringify(key)},${JSON.stringify(value)}`)

  return [csvHeaders, ...csvRows].join("\n")
}
