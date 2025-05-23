import { getBigQueryClient } from "./bigquery"

// Define segment types
export type CustomerSegment = "high_value" | "regular" | "at_risk" | "inactive" | "new" | "one_time" | "loyal" | "vip"

// Define segment criteria
export interface SegmentCriteria {
  name: CustomerSegment
  label: string
  description: string
  color: string
  criteria: {
    minSpend?: number
    maxSpend?: number
    minVisits?: number
    maxVisits?: number
    daysSinceLastVisit?: number
    daysAsCustomer?: number
    churnRisk?: number
  }
}

// Define segment criteria
export const segmentDefinitions: SegmentCriteria[] = [
  {
    name: "high_value",
    label: "High Value",
    description: "Customers who spend significantly above average",
    color: "#4CAF50", // Green
    criteria: {
      minSpend: 1000,
      minVisits: 3,
    },
  },
  {
    name: "regular",
    label: "Regular",
    description: "Customers who visit and spend consistently",
    color: "#2196F3", // Blue
    criteria: {
      minSpend: 200,
      maxSpend: 999,
      minVisits: 2,
    },
  },
  {
    name: "at_risk",
    label: "At Risk",
    description: "Previously active customers who haven't visited recently",
    color: "#FF9800", // Orange
    criteria: {
      minVisits: 2,
      daysSinceLastVisit: 90,
    },
  },
  {
    name: "inactive",
    label: "Inactive",
    description: "Customers who haven't visited in a long time",
    color: "#F44336", // Red
    criteria: {
      daysSinceLastVisit: 180,
    },
  },
  {
    name: "new",
    label: "New",
    description: "Recently acquired customers",
    color: "#9C27B0", // Purple
    criteria: {
      daysAsCustomer: 30,
      maxVisits: 2,
    },
  },
  {
    name: "one_time",
    label: "One-Time",
    description: "Customers who have only visited once",
    color: "#607D8B", // Blue Grey
    criteria: {
      maxVisits: 1,
      daysSinceLastVisit: 30,
    },
  },
  {
    name: "loyal",
    label: "Loyal",
    description: "Long-term customers with consistent visits",
    color: "#00BCD4", // Cyan
    criteria: {
      minVisits: 5,
      daysAsCustomer: 180,
    },
  },
  {
    name: "vip",
    label: "VIP",
    description: "Top-tier customers with high spend and frequency",
    color: "#E91E63", // Pink
    criteria: {
      minSpend: 2000,
      minVisits: 5,
    },
  },
]

// Get segment for a customer based on their metrics
export function getCustomerSegment(customerMetrics: {
  totalSpend: number
  visitCount: number
  daysSinceLastVisit: number
  daysAsCustomer: number
  churnRisk?: number
}): CustomerSegment {
  // Check each segment in priority order
  if (customerMetrics.totalSpend >= 2000 && customerMetrics.visitCount >= 5) {
    return "vip"
  }

  if (customerMetrics.totalSpend >= 1000 && customerMetrics.visitCount >= 3) {
    return "high_value"
  }

  if (customerMetrics.visitCount >= 5 && customerMetrics.daysAsCustomer >= 180) {
    return "loyal"
  }

  if (customerMetrics.daysSinceLastVisit >= 180) {
    return "inactive"
  }

  if (customerMetrics.visitCount >= 2 && customerMetrics.daysSinceLastVisit >= 90) {
    return "at_risk"
  }

  if (customerMetrics.daysAsCustomer <= 30 && customerMetrics.visitCount <= 2) {
    return "new"
  }

  if (customerMetrics.visitCount === 1 && customerMetrics.daysSinceLastVisit >= 30) {
    return "one_time"
  }

  if (customerMetrics.totalSpend >= 200 && customerMetrics.totalSpend < 1000 && customerMetrics.visitCount >= 2) {
    return "regular"
  }

  // Default segment
  return "regular"
}

// Get segment details by name
export function getSegmentDetails(segmentName: CustomerSegment): SegmentCriteria {
  return segmentDefinitions.find((segment) => segment.name === segmentName) || segmentDefinitions[1] // Default to regular
}

// Get customer metrics from BigQuery
export async function getCustomerMetrics(orgId: string, clientId: string) {
  try {
    const client = getBigQueryClient()

    // Query customer metrics
    const query = `
      WITH customer_data AS (
        SELECT
          clientId,
          SUM(amount) as total_spend,
          COUNT(DISTINCT DATE(timestamp)) as visit_count,
          DATE_DIFF(CURRENT_DATE(), MAX(DATE(timestamp)), DAY) as days_since_last_visit,
          DATE_DIFF(CURRENT_DATE(), MIN(DATE(timestamp)), DAY) as days_as_customer
        FROM
          \`slickassess_dataset.client_events\`
        WHERE
          orgId = @orgId
          AND clientId = @clientId
        GROUP BY
          clientId
      )
      SELECT
        total_spend,
        visit_count,
        days_since_last_visit,
        days_as_customer
      FROM
        customer_data
    `

    const [rows] = await client.query({
      query,
      params: { orgId, clientId },
    })

    if (!rows || rows.length === 0) {
      // Return default metrics for new customers
      return {
        totalSpend: 0,
        visitCount: 0,
        daysSinceLastVisit: 0,
        daysAsCustomer: 0,
      }
    }

    return {
      totalSpend: rows[0].total_spend || 0,
      visitCount: rows[0].visit_count || 0,
      daysSinceLastVisit: rows[0].days_since_last_visit || 0,
      daysAsCustomer: rows[0].days_as_customer || 0,
    }
  } catch (error) {
    console.error("Error getting customer metrics:", error)
    // Return default metrics on error
    return {
      totalSpend: 0,
      visitCount: 0,
      daysSinceLastVisit: 0,
      daysAsCustomer: 0,
    }
  }
}

// Get segment distribution for an organization
export async function getSegmentDistribution(orgId: string) {
  try {
    const client = getBigQueryClient()

    // Query all customers in the organization
    const query = `
      WITH customer_data AS (
        SELECT
          clientId,
          SUM(amount) as total_spend,
          COUNT(DISTINCT DATE(timestamp)) as visit_count,
          DATE_DIFF(CURRENT_DATE(), MAX(DATE(timestamp)), DAY) as days_since_last_visit,
          DATE_DIFF(CURRENT_DATE(), MIN(DATE(timestamp)), DAY) as days_as_customer
        FROM
          \`slickassess_dataset.client_events\`
        WHERE
          orgId = @orgId
        GROUP BY
          clientId
      )
      SELECT
        clientId,
        total_spend,
        visit_count,
        days_since_last_visit,
        days_as_customer
      FROM
        customer_data
    `

    const [rows] = await client.query({
      query,
      params: { orgId },
    })

    if (!rows || rows.length === 0) {
      return []
    }

    // Calculate segment for each customer
    const customerSegments = rows.map((row: any) => {
      const metrics = {
        totalSpend: row.total_spend || 0,
        visitCount: row.visit_count || 0,
        daysSinceLastVisit: row.days_since_last_visit || 0,
        daysAsCustomer: row.days_as_customer || 0,
      }

      const segment = getCustomerSegment(metrics)

      return {
        clientId: row.clientId,
        segment,
      }
    })

    // Count customers in each segment
    const segmentCounts: Record<CustomerSegment, number> = {
      high_value: 0,
      regular: 0,
      at_risk: 0,
      inactive: 0,
      new: 0,
      one_time: 0,
      loyal: 0,
      vip: 0,
    }

    customerSegments.forEach((customer) => {
      segmentCounts[customer.segment]++
    })

    // Format for chart display
    return Object.entries(segmentCounts).map(([segment, count]) => {
      const segmentInfo = getSegmentDetails(segment as CustomerSegment)
      return {
        segment,
        label: segmentInfo.label,
        count,
        color: segmentInfo.color,
      }
    })
  } catch (error) {
    console.error("Error getting segment distribution:", error)
    return []
  }
}

// Get customers in a specific segment
export async function getCustomersInSegment(orgId: string, segment: CustomerSegment) {
  try {
    const client = getBigQueryClient()

    // Query all customers in the organization
    const query = `
      WITH customer_data AS (
        SELECT
          clientId,
          SUM(amount) as total_spend,
          COUNT(DISTINCT DATE(timestamp)) as visit_count,
          DATE_DIFF(CURRENT_DATE(), MAX(DATE(timestamp)), DAY) as days_since_last_visit,
          DATE_DIFF(CURRENT_DATE(), MIN(DATE(timestamp)), DAY) as days_as_customer
        FROM
          \`slickassess_dataset.client_events\`
        WHERE
          orgId = @orgId
        GROUP BY
          clientId
      )
      SELECT
        clientId,
        total_spend,
        visit_count,
        days_since_last_visit,
        days_as_customer
      FROM
        customer_data
    `

    const [rows] = await client.query({
      query,
      params: { orgId },
    })

    if (!rows || rows.length === 0) {
      return []
    }

    // Calculate segment for each customer and filter by requested segment
    const customersInSegment = rows
      .map((row: any) => {
        const metrics = {
          totalSpend: row.total_spend || 0,
          visitCount: row.visit_count || 0,
          daysSinceLastVisit: row.days_since_last_visit || 0,
          daysAsCustomer: row.days_as_customer || 0,
        }

        const customerSegment = getCustomerSegment(metrics)

        return {
          clientId: row.clientId,
          segment: customerSegment,
          metrics,
        }
      })
      .filter((customer) => customer.segment === segment)

    return customersInSegment
  } catch (error) {
    console.error("Error getting customers in segment:", error)
    return []
  }
}
