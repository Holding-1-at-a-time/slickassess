import { getBigQueryClient } from "./bigquery"

class PredictiveAnalyticsError extends Error {
  code: string
  context: any

  constructor(message: string, code: string, context?: any) {
    super(message)
    this.name = "PredictiveAnalyticsError"
    this.code = code
    this.context = context
    Object.setPrototypeOf(this, PredictiveAnalyticsError.prototype)
  }
}

class DataInsufficientError extends PredictiveAnalyticsError {
  constructor(required: number, actual: number) {
    super(
      `Insufficient data for prediction. Requires at least ${required} data points, but only ${actual} were provided.`,
      "INSUFFICIENT_DATA",
      { required, actual },
    )
    Object.setPrototypeOf(this, DataInsufficientError.prototype)
  }
}

class InvalidDateRangeError extends PredictiveAnalyticsError {
  constructor(min: number, actual: number) {
    super(
      `Invalid date range. Date range cannot exceed ${min} days, but ${actual} were provided.`,
      "INVALID_DATE_RANGE",
      { min, actual },
    )
    Object.setPrototypeOf(this, InvalidDateRangeError.prototype)
  }
}

class BigQueryConnectionError extends PredictiveAnalyticsError {
  constructor(originalError: Error) {
    super(`Failed to connect to BigQuery or execute query.`, "BIGQUERY_CONNECTION_ERROR", {
      originalError: originalError.message,
    })
    Object.setPrototypeOf(this, BigQueryConnectionError.prototype)
  }
}

// Simple linear regression for time series forecasting
function linearRegression(data: Array<{ x: number; y: number }>): { slope: number; intercept: number; r2: number } {
  const n = data.length
  let sumX = 0
  let sumY = 0
  let sumXY = 0
  let sumXX = 0
  let sumYY = 0

  for (const point of data) {
    sumX += point.x
    sumY += point.y
    sumXY += point.x * point.y
    sumXX += point.x * point.x
    sumYY += point.y * point.y
  }

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX)
  const intercept = (sumY - slope * sumX) / n

  // Calculate R-squared (coefficient of determination)
  const yMean = sumY / n
  let totalVariation = 0
  let explainedVariation = 0

  for (const point of data) {
    const prediction = slope * point.x + intercept
    totalVariation += Math.pow(point.y - yMean, 2)
    explainedVariation += Math.pow(prediction - yMean, 2)
  }

  const r2 = explainedVariation / totalVariation

  return { slope, intercept, r2 }
}

// Forecast future values using linear regression
export function forecastLinear(
  data: Array<{ x: number; y: number }>,
  periodsAhead: number,
): Array<{ x: number; y: number; isForecasted: boolean }> {
  // Original data points
  const result = data.map((point) => ({ ...point, isForecasted: false }))

  if (data.length < 2) {
    return result
  }

  // Calculate regression
  const { slope, intercept } = linearRegression(data)

  // Get the last x value
  const lastX = data[data.length - 1].x
  const xStep = data.length > 1 ? data[1].x - data[0].x : 1

  // Generate forecasted points
  for (let i = 1; i <= periodsAhead; i++) {
    const x = lastX + i * xStep
    const y = slope * x + intercept
    result.push({ x, y: Math.max(0, y), isForecasted: true })
  }

  return result
}

// Forecast appointments using BigQuery data
export async function forecastAppointments(
  orgId: string,
  days = 30,
  forecastDays = 14,
): Promise<{
  historicalData: Array<{ date: string; count: number }>
  forecastData: Array<{ date: string; count: number; confidence: number }>
  trend: "increasing" | "decreasing" | "stable"
  confidence: number
}> {
  try {
    // Validate inputs
    if (days < 7) {
      throw new DataInsufficientError(7, days)
    }

    if (forecastDays > 90) {
      throw new InvalidDateRangeError(0, forecastDays)
    }

    const client = getBigQueryClient()

    // Query historical appointment data
    const query = `
      SELECT
        DATE(timestamp) as date,
        COUNT(*) as count
      FROM
        \`slickassess_dataset.appointment_events\`
      WHERE
        orgId = @orgId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @days DAY)
      GROUP BY
        date
      ORDER BY
        date ASC
    `

    const [rows] = await client.query({
      query,
      params: { orgId, days },
    })

    // Convert to format needed for regression
    const historicalData = rows.map((row: any) => ({
      date: row.date.value,
      count: row.count,
    }))

    if (historicalData.length < 7) {
      throw new DataInsufficientError(7, historicalData.length)
    }

    // Convert dates to numeric values for regression
    const baseDate = new Date(historicalData[0]?.date || new Date()).getTime()
    const regressionData = historicalData.map((point, index) => ({
      x: index,
      y: point.count,
    }))

    // Generate forecast
    const forecast = forecastLinear(regressionData, forecastDays)
    const forecastOnly = forecast.filter((point) => point.isForecasted)

    // Convert forecast back to dates
    const millisecondsPerDay = 24 * 60 * 60 * 1000
    const forecastData = forecastOnly.map((point) => {
      const date = new Date(baseDate + point.x * millisecondsPerDay)
      return {
        date: date.toISOString().split("T")[0],
        count: Math.round(point.y),
        confidence: 0.8 - (point.x - regressionData.length) * 0.05, // Confidence decreases with time
      }
    })

    // Calculate trend
    const { slope, r2 } = linearRegression(regressionData)
    const trend = slope > 0.1 ? "increasing" : slope < -0.1 ? "decreasing" : "stable"

    return {
      historicalData,
      forecastData,
      trend,
      confidence: r2,
    }
  } catch (error) {
    if (error instanceof PredictiveAnalyticsError) {
      console.error(`Predictive Analytics Error [${error.code}]:`, error.message, error.context)
      throw error
    }

    if (error.message?.includes("BigQuery")) {
      throw new BigQueryConnectionError(error as Error)
    }

    console.error("Unexpected error in forecastAppointments:", error)
    throw new PredictiveAnalyticsError("Failed to forecast appointments", "FORECAST_FAILED", {
      originalError: error.message,
    })
  }
}

// Forecast revenue using BigQuery data
export async function forecastRevenue(
  orgId: string,
  months = 12,
  forecastMonths = 3,
): Promise<{
  historicalData: Array<{ month: string; revenue: number }>
  forecastData: Array<{ month: string; revenue: number; confidence: number }>
  trend: "increasing" | "decreasing" | "stable"
  confidence: number
}> {
  try {
    const client = getBigQueryClient()

    // Query historical revenue data
    const query = `
      SELECT
        FORMAT_TIMESTAMP('%Y-%m', timestamp) as month,
        SUM(amount) as revenue
      FROM
        \`slickassess_dataset.invoice_events\`
      WHERE
        orgId = @orgId
        AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL @months MONTH)
      GROUP BY
        month
      ORDER BY
        month ASC
    `

    const [rows] = await client.query({
      query,
      params: { orgId, months },
    })

    // Convert to format needed for regression
    const historicalData = rows.map((row: any) => ({
      month: row.month,
      revenue: row.revenue,
    }))

    // Convert months to numeric values for regression
    const regressionData = historicalData.map((point, index) => ({
      x: index,
      y: point.revenue,
    }))

    // Generate forecast
    const forecast = forecastLinear(regressionData, forecastMonths)
    const forecastOnly = forecast.filter((point) => point.isForecasted)

    // Convert forecast back to months
    const forecastData = forecastOnly.map((point) => {
      const lastMonth = historicalData[historicalData.length - 1].month
      const [lastYear, lastMonthNum] = lastMonth.split("-").map(Number)

      let forecastYear = lastYear
      let forecastMonth = lastMonthNum + (point.x - regressionData.length + 1)

      // Handle year rollover
      while (forecastMonth > 12) {
        forecastYear++
        forecastMonth -= 12
      }

      const monthStr = `${forecastYear}-${String(forecastMonth).padStart(2, "0")}`

      return {
        month: monthStr,
        revenue: Math.max(0, Math.round(point.y)),
        confidence: 0.85 - (point.x - regressionData.length) * 0.1, // Confidence decreases with time
      }
    })

    // Calculate trend
    const { slope, r2 } = linearRegression(regressionData)
    const trend = slope > 100 ? "increasing" : slope < -100 ? "decreasing" : "stable"

    return {
      historicalData,
      forecastData,
      trend,
      confidence: r2,
    }
  } catch (error) {
    console.error("Error forecasting revenue:", error)
    return {
      historicalData: [],
      forecastData: [],
      trend: "stable",
      confidence: 0,
    }
  }
}

// Predict customer churn probability
export async function predictCustomerChurn(
  orgId: string,
  clientId: string,
): Promise<{
  churnProbability: number
  riskLevel: "low" | "medium" | "high"
  factors: Array<{ factor: string; impact: number }>
}> {
  try {
    if (!orgId || !clientId) {
      throw new PredictiveAnalyticsError("Missing required parameters", "MISSING_PARAMETERS", {
        orgId: !!orgId,
        clientId: !!clientId,
      })
    }

    const client = getBigQueryClient()

    // Query customer activity data
    const query = `
      SELECT
        COUNT(DISTINCT CASE WHEN timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 30 DAY) THEN DATE(timestamp) END) as recent_activity_days,
        COUNT(DISTINCT CASE WHEN timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY) THEN DATE(timestamp) END) as quarterly_activity_days,
        MAX(timestamp) as last_activity,
        AVG(amount) as avg_transaction,
        COUNT(*) as total_transactions
      FROM
        \`slickassess_dataset.client_events\`
      WHERE
        orgId = @orgId
        AND clientId = @clientId
    `

    const [rows] = await client.query({
      query,
      params: { orgId, clientId },
    })

    if (!rows || rows.length === 0) {
      throw new DataInsufficientError(1, 0)
    }

    const data = rows[0]

    // Calculate days since last activity
    const lastActivity = new Date(data.last_activity?.value || new Date())
    const daysSinceActivity = Math.floor((new Date().getTime() - lastActivity.getTime()) / (24 * 60 * 60 * 1000))

    // Calculate churn probability based on activity patterns
    let churnProbability = 0
    const factors: Array<{ factor: string; impact: number }> = []

    // Factor 1: Recent activity
    if (data.recent_activity_days === 0) {
      churnProbability += 0.3
      factors.push({ factor: "No activity in last 30 days", impact: 0.3 })
    } else if (data.recent_activity_days < 3) {
      churnProbability += 0.15
      factors.push({ factor: "Limited recent activity", impact: 0.15 })
    }

    // Factor 2: Days since last activity
    if (daysSinceActivity > 60) {
      churnProbability += 0.4
      factors.push({ factor: "Inactive for 60+ days", impact: 0.4 })
    } else if (daysSinceActivity > 30) {
      churnProbability += 0.2
      factors.push({ factor: "Inactive for 30+ days", impact: 0.2 })
    }

    // Factor 3: Transaction history
    if (data.total_transactions < 2) {
      churnProbability += 0.25
      factors.push({ factor: "Few total transactions", impact: 0.25 })
    }

    // Factor 4: Transaction value
    if (data.avg_transaction < 50) {
      churnProbability += 0.1
      factors.push({ factor: "Low average transaction value", impact: 0.1 })
    }

    // Cap probability at 0.95
    churnProbability = Math.min(0.95, churnProbability)

    // Determine risk level
    let riskLevel: "low" | "medium" | "high" = "low"
    if (churnProbability > 0.7) {
      riskLevel = "high"
    } else if (churnProbability > 0.3) {
      riskLevel = "medium"
    }

    return {
      churnProbability,
      riskLevel,
      factors,
    }
  } catch (error) {
    if (error instanceof PredictiveAnalyticsError) {
      console.error(`Customer Churn Prediction Error [${error.code}]:`, error.message, error.context)
      throw error
    }

    console.error("Error predicting customer churn:", error)
    throw new PredictiveAnalyticsError("Failed to predict customer churn", "CHURN_PREDICTION_FAILED", {
      orgId,
      clientId,
      originalError: error.message,
    })
  }
}
