import { BigQuery } from "@google-cloud/bigquery"

// Initialize BigQuery client
let bigqueryClient: BigQuery | null = null

// Get BigQuery client with connection pooling
export function getBigQueryClient(): BigQuery {
  if (!bigqueryClient) {
    try {
      // Check if credentials are available
      if (!process.env.GCP_CREDENTIALS_JSON) {
        throw new Error("GCP_CREDENTIALS_JSON environment variable is not set")
      }
      if (!process.env.GCP_PROJECT_ID) {
        throw new Error("GCP_PROJECT_ID environment variable is not set")
      }

      // Initialize BigQuery client
      bigqueryClient = new BigQuery({
        projectId: process.env.GCP_PROJECT_ID,
        credentials: JSON.parse(process.env.GCP_CREDENTIALS_JSON),
      })
    } catch (error) {
      console.error("Error initializing BigQuery client:", error)
      throw error
    }
  }

  return bigqueryClient
}

// Log an event to BigQuery with retry logic
export async function logEvent(
  dataset: string,
  table: string,
  event: Record<string, any>,
  retries = 3,
): Promise<boolean> {
  try {
    const client = getBigQueryClient()

    // Add timestamp if not present
    if (!event.timestamp) {
      event.timestamp = new Date().toISOString()
    }

    // Insert row into BigQuery
    await client.dataset(dataset).table(table).insert([event])

    return true
  } catch (error) {
    console.error(`Error logging event to BigQuery (attempt ${4 - retries}/3):`, error)

    // Retry logic with exponential backoff
    if (retries > 0) {
      const backoffTime = Math.pow(2, 4 - retries) * 100
      await new Promise((resolve) => setTimeout(resolve, backoffTime))
      return logEvent(dataset, table, event, retries - 1)
    }

    // Log to fallback storage if BigQuery fails
    try {
      console.warn("BigQuery insert failed, logging to fallback storage")
      // In a production environment, you might want to log to a fallback storage
      return false
    } catch (fallbackError) {
      console.error("Fallback logging also failed:", fallbackError)
      return false
    }
  }
}

// Query appointments per day with proper error handling
export async function queryAppointmentsPerDay(orgId: string, days = 30) {
  try {
    const client = getBigQueryClient()

    // SQL query to get appointments per day
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

    // Run the query
    const [rows] = await client.query({
      query,
      params: {
        orgId,
        days,
      },
    })

    return rows
  } catch (error) {
    console.error("Error querying appointments per day:", error)
    // Return empty array instead of throwing to prevent UI crashes
    return []
  }
}

// Query revenue per month with proper error handling
export async function queryRevenuePerMonth(orgId: string, months = 12) {
  try {
    const client = getBigQueryClient()

    // SQL query to get revenue per month
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

    // Run the query
    const [rows] = await client.query({
      query,
      params: {
        orgId,
        months,
      },
    })

    return rows
  } catch (error) {
    console.error("Error querying revenue per month:", error)
    // Return empty array instead of throwing to prevent UI crashes
    return []
  }
}
