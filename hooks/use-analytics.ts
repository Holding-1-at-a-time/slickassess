"use client"

import { useAuth } from "@clerk/nextjs"
import { useEffect, useCallback } from "react"
import { getAnalyticsTracker, initializeAnalytics } from "@/lib/analytics/analytics-tracker"

/**
 * Hook for analytics tracking in React components
 */
export function useAnalytics() {
  const { getToken, orgId, userId } = useAuth()

  // Initialize analytics tracker with auth token
  useEffect(() => {
    async function initTracker() {
      try {
        const token = await getToken({ template: "convex" })
        initializeAnalytics(token)
      } catch (error) {
        console.error("Failed to initialize analytics:", error)
      }
    }

    if (userId && orgId) {
      initTracker()
    }
  }, [getToken, userId, orgId])

  // Track page view
  const trackPageView = useCallback(
    async (path: string, title: string, additionalData?: Record<string, any>) => {
      if (!orgId || !userId) return

      const tracker = getAnalyticsTracker()
      await tracker.trackPageView({
        path,
        title,
        referrer: document.referrer,
        userAgent: navigator.userAgent,
        loadTime: performance.now(),
        ...additionalData,
      })
    },
    [orgId, userId],
  )

  // Track user interaction
  const trackInteraction = useCallback(
    async (element: string, action: string, value?: string | number, metadata?: Record<string, any>) => {
      if (!orgId || !userId) return

      const tracker = getAnalyticsTracker()
      await tracker.trackInteraction({
        element,
        action,
        value,
        metadata,
      })
    },
    [orgId, userId],
  )

  // Track business event
  const trackBusinessEvent = useCallback(
    async (event: string, entityType: string, entityId: string, value?: number, metadata?: Record<string, any>) => {
      if (!orgId || !userId) return

      const tracker = getAnalyticsTracker()
      await tracker.trackBusinessEvent({
        event,
        entityType,
        entityId,
        value,
        metadata,
      })
    },
    [orgId, userId],
  )

  // Track error
  const trackError = useCallback(
    async (message: string, component?: string, stack?: string, metadata?: Record<string, any>) => {
      if (!orgId) return

      const tracker = getAnalyticsTracker()
      await tracker.trackError({
        message,
        stack,
        component,
        userId,
        metadata,
      })
    },
    [orgId, userId],
  )

  // Track performance metric
  const trackPerformance = useCallback(
    async (metric: string, value: number, unit: string, metadata?: Record<string, any>) => {
      if (!orgId) return

      const tracker = getAnalyticsTracker()
      await tracker.trackPerformance({
        metric,
        value,
        unit,
        metadata,
      })
    },
    [orgId],
  )

  return {
    trackPageView,
    trackInteraction,
    trackBusinessEvent,
    trackError,
    trackPerformance,
    isEnabled: !!orgId && !!userId,
  }
}
