import { getBigQueryClient } from "./bigquery"
import { ConvexHttpClient } from "convex/http"
import { api } from "@/convex/_generated/api"

/**
 * Analytics dashboard service for comprehensive reporting
 */
export class AnalyticsDashboard {
  private bigQueryClient: any
  private convexClient: ConvexHttpClient

  constructor(convexUrl: string, authToken?: string) {
    this.bigQueryClient = getBigQueryClient()
    this.convexClient = new ConvexHttpClient(convexUrl)
    if (authToken) {
      this.convexClient.setAuth(authToken)
    }
  }

  /**
   * Get comprehensive dashboard data
   */
  async getDashboardData(orgId: string, timeRange: TimeRange = "30d"): Promise<DashboardData> {
    const [overview, userEngagement, businessMetrics, performanceMetrics, realtimeData] = await Promise.all([
      this.getOverviewMetrics(orgId, timeRange),
      this.getUserEngagementMetrics(orgId, timeRange),
      this.getBusinessMetrics(orgId, timeRange),
      this.getPerformanceMetrics(orgId, timeRange),
      this.getRealTimeData(orgId),
    ])

    return {
      overview,
      userEngagement,
      businessMetrics,
      performanceMetrics,
      realtimeData,
      generatedAt: new Date().toISOString(),
    }
  }

  /**
   * Get overview metrics
   */
  private async getOverviewMetrics(orgId: string, timeRange: string): Promise<OverviewMetrics> {
    const days = this.parseTimeRange(timeRange)

    const query = `
      WITH date_range AS (
        SELECT DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY) as start_date
      ),
      page_views AS (
        SELECT 
          COUNT(*) as total_views,
          COUNT(DISTINCT user_id) as unique_visitors,
          COUNT(DISTINCT session_id) as sessions
        FROM \`slickassess_dataset.page_views\`
        WHERE org_id = @orgId 
          AND DATE(timestamp) >= (SELECT start_date FROM date_range)
      ),
      business_events AS (
        SELECT 
          COUNT(*) as total_events,
          COUNTIF(event = 'assessment_completed') as assessments_completed,
          COUNTIF(event = 'appointment_created') as appointments_created,
          COUNTIF(event = 'payment_received') as payments_received
        FROM \`slickassess_dataset.business_events\`
        WHERE org_id = @orgId 
          AND DATE(timestamp) >= (SELECT start_date FROM date_range)
      )
      SELECT 
        pv.total_views,
        pv.unique_visitors,
        pv.sessions,
        be.total_events,
        be.assessments_completed,
        be.appointments_created,
        be.payments_received
      FROM page_views pv
      CROSS JOIN business_events be
    `

    const [rows] = await this.bigQueryClient.query({
      query,
      params: { orgId, days },
    })

    const data = rows[0] || {}

    return {
      totalPageViews: data.total_views || 0,
      uniqueVisitors: data.unique_visitors || 0,
      totalSessions: data.sessions || 0,
      assessmentsCompleted: data.assessments_completed || 0,
      appointmentsCreated: data.appointments_created || 0,
      paymentsReceived: data.payments_received || 0,
      conversionRate: data.unique_visitors > 0 ? (data.assessments_completed / data.unique_visitors) * 100 : 0,
    }
  }

  /**
   * Get user engagement metrics
   */
  private async getUserEngagementMetrics(orgId: string, timeRange: string): Promise<UserEngagementMetrics> {
    const days = this.parseTimeRange(timeRange)

    const query = `
      WITH user_sessions AS (
        SELECT 
          user_id,
          session_id,
          MIN(timestamp) as session_start,
          MAX(timestamp) as session_end,
          COUNT(*) as page_views_in_session
        FROM \`slickassess_dataset.page_views\`
        WHERE org_id = @orgId 
          AND DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
          AND user_id IS NOT NULL
        GROUP BY user_id, session_id
      ),
      session_metrics AS (
        SELECT 
          AVG(TIMESTAMP_DIFF(session_end, session_start, SECOND)) as avg_session_duration,
          AVG(page_views_in_session) as avg_pages_per_session,
          COUNT(DISTINCT user_id) as active_users,
          COUNT(*) as total_sessions
        FROM user_sessions
      ),
      interaction_metrics AS (
        SELECT 
          COUNT(*) as total_interactions,
          COUNT(DISTINCT user_id) as users_with_interactions,
          AVG(CASE WHEN action = 'click' THEN 1 ELSE 0 END) as click_rate
        FROM \`slickassess_dataset.user_interactions\`
        WHERE org_id = @orgId 
          AND DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
      )
      SELECT 
        sm.avg_session_duration,
        sm.avg_pages_per_session,
        sm.active_users,
        sm.total_sessions,
        im.total_interactions,
        im.users_with_interactions,
        im.click_rate
      FROM session_metrics sm
      CROSS JOIN interaction_metrics im
    `

    const [rows] = await this.bigQueryClient.query({
      query,
      params: { orgId, days },
    })

    const data = rows[0] || {}

    return {
      averageSessionDuration: data.avg_session_duration || 0,
      averagePagesPerSession: data.avg_pages_per_session || 0,
      activeUsers: data.active_users || 0,
      totalSessions: data.total_sessions || 0,
      totalInteractions: data.total_interactions || 0,
      engagementRate: data.active_users > 0 ? (data.users_with_interactions / data.active_users) * 100 : 0,
      bounceRate:
        data.total_sessions > 0
          ? ((data.total_sessions - data.users_with_interactions) / data.total_sessions) * 100
          : 0,
    }
  }

  /**
   * Get business metrics
   */
  private async getBusinessMetrics(orgId: string, timeRange: string): Promise<BusinessMetrics> {
    const days = this.parseTimeRange(timeRange)

    const query = `
      WITH revenue_data AS (
        SELECT 
          SUM(CAST(JSON_EXTRACT_SCALAR(metadata, '$.amount') AS FLOAT64)) as total_revenue,
          COUNT(*) as total_transactions,
          AVG(CAST(JSON_EXTRACT_SCALAR(metadata, '$.amount') AS FLOAT64)) as avg_transaction_value
        FROM \`slickassess_dataset.business_events\`
        WHERE org_id = @orgId 
          AND event = 'payment_received'
          AND DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
      ),
      client_data AS (
        SELECT 
          COUNT(DISTINCT JSON_EXTRACT_SCALAR(metadata, '$.clientId')) as total_clients,
          COUNTIF(event = 'client_created') as new_clients
        FROM \`slickassess_dataset.business_events\`
        WHERE org_id = @orgId 
          AND DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
      ),
      assessment_data AS (
        SELECT 
          COUNT(*) as total_assessments,
          AVG(CAST(JSON_EXTRACT_SCALAR(metadata, '$.completionTime') AS FLOAT64)) as avg_completion_time
        FROM \`slickassess_dataset.business_events\`
        WHERE org_id = @orgId 
          AND event = 'assessment_completed'
          AND DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
      )
      SELECT 
        rd.total_revenue,
        rd.total_transactions,
        rd.avg_transaction_value,
        cd.total_clients,
        cd.new_clients,
        ad.total_assessments,
        ad.avg_completion_time
      FROM revenue_data rd
      CROSS JOIN client_data cd
      CROSS JOIN assessment_data ad
    `

    const [rows] = await this.bigQueryClient.query({
      query,
      params: { orgId, days },
    })

    const data = rows[0] || {}

    return {
      totalRevenue: data.total_revenue || 0,
      totalTransactions: data.total_transactions || 0,
      averageTransactionValue: data.avg_transaction_value || 0,
      totalClients: data.total_clients || 0,
      newClients: data.new_clients || 0,
      totalAssessments: data.total_assessments || 0,
      averageAssessmentTime: data.avg_completion_time || 0,
      clientGrowthRate: data.total_clients > 0 ? (data.new_clients / data.total_clients) * 100 : 0,
    }
  }

  /**
   * Get performance metrics
   */
  private async getPerformanceMetrics(orgId: string, timeRange: string): Promise<PerformanceMetrics> {
    const days = this.parseTimeRange(timeRange)

    const query = `
      WITH performance_data AS (
        SELECT 
          metric,
          AVG(value) as avg_value,
          MIN(value) as min_value,
          MAX(value) as max_value,
          STDDEV(value) as std_dev
        FROM \`slickassess_dataset.performance_events\`
        WHERE org_id = @orgId 
          AND DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
        GROUP BY metric
      ),
      error_data AS (
        SELECT 
          COUNT(*) as total_errors,
          COUNT(DISTINCT user_id) as users_with_errors
        FROM \`slickassess_dataset.error_events\`
        WHERE org_id = @orgId 
          AND DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL @days DAY)
      )
      SELECT 
        pd.metric,
        pd.avg_value,
        pd.min_value,
        pd.max_value,
        pd.std_dev,
        ed.total_errors,
        ed.users_with_errors
      FROM performance_data pd
      CROSS JOIN error_data ed
    `

    const [rows] = await this.bigQueryClient.query({
      query,
      params: { orgId, days },
    })

    const performanceMetrics: Record<string, any> = {}
    let errorData = { total_errors: 0, users_with_errors: 0 }

    rows.forEach((row: any) => {
      if (row.metric) {
        performanceMetrics[row.metric] = {
          average: row.avg_value,
          min: row.min_value,
          max: row.max_value,
          standardDeviation: row.std_dev,
        }
      }
      errorData = {
        total_errors: row.total_errors || 0,
        users_with_errors: row.users_with_errors || 0,
      }
    })

    return {
      pageLoadTime: performanceMetrics.page_load_time || { average: 0, min: 0, max: 0, standardDeviation: 0 },
      apiResponseTime: performanceMetrics.api_response_time || { average: 0, min: 0, max: 0, standardDeviation: 0 },
      errorRate: errorData.total_errors,
      usersAffectedByErrors: errorData.users_with_errors,
      uptime: 99.9, // This would come from external monitoring
    }
  }

  /**
   * Get real-time data from Convex
   */
  private async getRealTimeData(orgId: string): Promise<RealTimeData> {
    try {
      const data = await this.convexClient.query(api.realTimeAnalytics.getDashboardData, { orgId })
      return {
        activeUsers: data.activeUsers || 0,
        currentSessions: data.metrics?.totalAppointments || 0,
        recentActivity: data.activityFeed || [],
        systemStatus: "operational",
      }
    } catch (error) {
      console.error("Error fetching real-time data:", error)
      return {
        activeUsers: 0,
        currentSessions: 0,
        recentActivity: [],
        systemStatus: "error",
      }
    }
  }

  /**
   * Parse time range string to days
   */
  private parseTimeRange(timeRange: string): number {
    const rangeMap: Record<string, number> = {
      "1d": 1,
      "7d": 7,
      "30d": 30,
      "90d": 90,
      "1y": 365,
    }
    return rangeMap[timeRange] || 30
  }

  /**
   * Export analytics data
   */
  async exportData(orgId: string, format: "csv" | "json", timeRange: TimeRange = "30d"): Promise<string> {
    const data = await this.getDashboardData(orgId, timeRange)

    if (format === "json") {
      return JSON.stringify(data, null, 2)
    }

    // Convert to CSV format
    const csvData = this.convertToCSV(data)
    return csvData
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: DashboardData): string {
    const rows: string[] = []

    // Add headers
    rows.push("Metric,Value,Category")

    // Add overview metrics
    Object.entries(data.overview).forEach(([key, value]) => {
      rows.push(`${key},${value},overview`)
    })

    // Add user engagement metrics
    Object.entries(data.userEngagement).forEach(([key, value]) => {
      rows.push(`${key},${value},engagement`)
    })

    // Add business metrics
    Object.entries(data.businessMetrics).forEach(([key, value]) => {
      rows.push(`${key},${value},business`)
    })

    return rows.join("\n")
  }
}

// Type definitions
export type TimeRange = "1d" | "7d" | "30d" | "90d" | "1y"

export interface DashboardData {
  overview: OverviewMetrics
  userEngagement: UserEngagementMetrics
  businessMetrics: BusinessMetrics
  performanceMetrics: PerformanceMetrics
  realtimeData: RealTimeData
  generatedAt: string
}

export interface OverviewMetrics {
  totalPageViews: number
  uniqueVisitors: number
  totalSessions: number
  assessmentsCompleted: number
  appointmentsCreated: number
  paymentsReceived: number
  conversionRate: number
}

export interface UserEngagementMetrics {
  averageSessionDuration: number
  averagePagesPerSession: number
  activeUsers: number
  totalSessions: number
  totalInteractions: number
  engagementRate: number
  bounceRate: number
}

export interface BusinessMetrics {
  totalRevenue: number
  totalTransactions: number
  averageTransactionValue: number
  totalClients: number
  newClients: number
  totalAssessments: number
  averageAssessmentTime: number
  clientGrowthRate: number
}

export interface PerformanceMetrics {
  pageLoadTime: MetricStats
  apiResponseTime: MetricStats
  errorRate: number
  usersAffectedByErrors: number
  uptime: number
}

export interface MetricStats {
  average: number
  min: number
  max: number
  standardDeviation: number
}

export interface RealTimeData {
  activeUsers: number
  currentSessions: number
  recentActivity: any[]
  systemStatus: "operational" | "degraded" | "error"
}
