import { BigQuery } from "@google-cloud/bigquery"

// Initialize BigQuery client
let bigqueryClient: BigQuery | null = null

// Get BigQuery client
export function getBigQueryClient(): BigQuery {
  if (!bigqueryClient) {
    // Check if credentials are available
    if (!process.env.GCP_CREDENTIALS_JSON) {
      throw new Error("GCP_CREDENTIALS_JSON environment variable is not set")
    }

    // Initialize BigQuery client
    bigqueryClient = new BigQuery({
      projectId: process.env.GCP_PROJECT_ID,
      credentials: JSON.parse(process.env.GCP_CREDENTIALS_JSON),
    })
  }

  return bigqueryClient
}

// Log an event to BigQuery
export async function logEvent(dataset: string, table: string, event: Record<string, any>) {
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
    console.error("Error logging event to BigQuery:", error)
    return false
  }
}

// Query appointments per day
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
    return []
  }
}

// Query revenue per month
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
    return []
  }
}
