import { BigQuery } from "@google-cloud/bigquery"
import fs from "fs"
import path from "path"

// Path to the fallback file
const FALLBACK_FILE_PATH = path.resolve(process.cwd(), "bigquery-fallback.jsonl")

// Helper to persist failed events to a file
function persistFailedEvent(dataset: string, table: string, event: Record<string, any>, error: any) {
  const fallbackEvent = {
    timestamp: new Date().toISOString(),
    dataset,
    table,
    event,
    error: error?.message || String(error),
  }
  try {
    fs.appendFileSync(FALLBACK_FILE_PATH, JSON.stringify(fallbackEvent) + "\n", { encoding: "utf8" })
    console.warn(`BigQuery event persisted to fallback file: ${FALLBACK_FILE_PATH}`)
  } catch (fileError) {
    // If even fallback fails, log to console as last resort
    console.error("Failed to persist BigQuery event to fallback file:", fileError)
  }
}

let bigqueryClient: BigQuery | null = null

async function getBigQueryClient() {
  if (bigqueryClient) {
    return bigqueryClient
  }

  bigqueryClient = new BigQuery()
  return bigqueryClient
}

export async function logEvent(
  dataset: string,
  table: string,
  event: Record<string, any>,
  retries = 3,
): Promise<boolean> {
  try {
    const bigquery = await getBigQueryClient()
    await bigquery.dataset(dataset).table(table).insert([event])
    return true
  } catch (error) {
    console.error(`Error logging event to BigQuery (attempt ${4 - retries}/3):`, error)

    // Retry logic with exponential backoff
    if (retries > 0) {
      const backoffTime = Math.pow(2, 4 - retries) * 100
      await new Promise((resolve) => setTimeout(resolve, backoffTime))
      return logEvent(dataset, table, event, retries - 1)
    }

    // Persist to fallback storage if all retries fail
    try {
      persistFailedEvent(dataset, table, event, error)
      console.warn("BigQuery insert failed, event persisted to fallback storage")
      return false
    } catch (fallbackError) {
      console.error("Fallback logging also failed:", fallbackError)
      return false
    }
  }
}
