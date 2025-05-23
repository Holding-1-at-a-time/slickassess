import { ConvexHttpClient } from "convex/http"
import { api } from "@/convex/_generated/api"
import { logEvent } from "./bigquery"

/**
 * Comprehensive analytics tracker for SlickAssess platform
 * Handles both real-time tracking and BigQuery logging
 */
export class AnalyticsTracker {
  private convexClient: ConvexHttpClient
  private isEnabled: boolean
  private batchQueue: Array<AnalyticsEvent> = []
  private batchTimeout: NodeJS.Timeout | null = null
  private readonly BATCH_SIZE = 10
  private readonly BATCH_TIMEOUT = 5000 // 5 seconds

  constructor(convexUrl: string, authToken?: string) {
    this.convexClient = new ConvexHttpClient(convexUrl)
    if (authToken) {
      this.convexClient.setAuth(authToken)
    }
    this.isEnabled = process.env.NODE_ENV === "production" || process.env.ANALYTICS_ENABLED === "true"
  }

  /**
   * Track a user action or event
   */
  async track(event: AnalyticsEvent): Promise<void> {
    if (!this.isEnabled) {
      console.log("Analytics tracking disabled:", event)
      return
    }

    try {
      // Add to batch queue
      this.batchQueue.push({
        ...event,
        timestamp: event.timestamp || Date.now(),
        sessionId: event.sessionId || this.generateSessionId(),
      })

      // Process batch if it reaches the size limit
      if (this.batchQueue.length >= this.BATCH_SIZE) {
        await this.processBatch()
      } else {
        // Set timeout to process batch
        this.scheduleBatchProcessing()
      }
    } catch (error) {
      console.error("Error tracking analytics event:", error)
    }
  }

  /**
   * Track page view
   */
  async trackPageView(data: PageViewData): Promise<void> {
    await this.track({
      type: "page_view",
      data,
      category: "navigation",
    })
  }

  /**
   * Track user interaction
   */
  async trackInteraction(data: InteractionData): Promise<void> {
    await this.track({
      type: "user_interaction",
      data,
      category: "engagement",
    })
  }

  /**
   * Track business event
   */
  async trackBusinessEvent(data: BusinessEventData): Promise<void> {
    await this.track({
      type: "business_event",
      data,
      category: "business",
    })
  }

  /**
   * Track error event
   */
  async trackError(data: ErrorEventData): Promise<void> {
    await this.track({
      type: "error",
      data,
      category: "system",
      severity: "error",
    })
  }

  /**
   * Track performance metrics
   */
  async trackPerformance(data: PerformanceData): Promise<void> {
    await this.track({
      type: "performance",
      data,
      category: "system",
    })
  }

  /**
   * Flush all pending events
   */
  async flush(): Promise<void> {
    if (this.batchQueue.length > 0) {
      await this.processBatch()
    }
  }

  /**
   * Process the current batch of events
   */
  private async processBatch(): Promise<void> {
    if (this.batchQueue.length === 0) return

    const events = [...this.batchQueue]
    this.batchQueue = []

    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout)
      this.batchTimeout = null
    }

    try {
      // Send to Convex for real-time analytics
      await Promise.all(
        events.map((event) =>
          this.convexClient.mutation(api.realTimeAnalytics.trackEvent, {
            orgId: event.orgId,
            eventType: event.type,
            eventData: event.data,
            userId: event.userId,
          }),
        ),
      )

      // Send to BigQuery for long-term storage and analysis
      await Promise.all(
        events.map((event) =>
          logEvent("slickassess_dataset", this.getTableName(event.type), {
            ...event.data,
            event_type: event.type,
            category: event.category,
            severity: event.severity,
            org_id: event.orgId,
            user_id: event.userId,
            session_id: event.sessionId,
            timestamp: new Date(event.timestamp).toISOString(),
          }),
        ),
      )
    } catch (error) {
      console.error("Error processing analytics batch:", error)
      // Re-queue events for retry
      this.batchQueue.unshift(...events)
    }
  }

  /**
   * Schedule batch processing
   */
  private scheduleBatchProcessing(): void {
    if (this.batchTimeout) return

    this.batchTimeout = setTimeout(() => {
      this.processBatch()
    }, this.BATCH_TIMEOUT)
  }

  /**
   * Get BigQuery table name based on event type
   */
  private getTableName(eventType: string): string {
    const tableMap: Record<string, string> = {
      page_view: "page_views",
      user_interaction: "user_interactions",
      business_event: "business_events",
      error: "error_events",
      performance: "performance_events",
    }
    return tableMap[eventType] || "general_events"
  }

  /**
   * Generate a session ID
   */
  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
  }
}

// Type definitions
export interface AnalyticsEvent {
  type: string
  data: Record<string, any>
  category: string
  severity?: "info" | "warning" | "error"
  orgId: string
  userId?: string
  sessionId?: string
  timestamp?: number
}

export interface PageViewData {
  path: string
  title: string
  referrer?: string
  userAgent?: string
  loadTime?: number
}

export interface InteractionData {
  element: string
  action: string
  value?: string | number
  metadata?: Record<string, any>
}

export interface BusinessEventData {
  event: string
  entityType: string
  entityId: string
  value?: number
  metadata?: Record<string, any>
}

export interface ErrorEventData {
  message: string
  stack?: string
  component?: string
  userId?: string
  metadata?: Record<string, any>
}

export interface PerformanceData {
  metric: string
  value: number
  unit: string
  metadata?: Record<string, any>
}

// Singleton instance
let analyticsInstance: AnalyticsTracker | null = null

export function getAnalyticsTracker(): AnalyticsTracker {
  if (!analyticsInstance) {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!
    analyticsInstance = new AnalyticsTracker(convexUrl)
  }
  return analyticsInstance
}

export function initializeAnalytics(authToken?: string): AnalyticsTracker {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!
  analyticsInstance = new AnalyticsTracker(convexUrl, authToken)
  return analyticsInstance
}
