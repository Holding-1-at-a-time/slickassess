import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireOrgRole } from "./utils/auth"
import { internal } from "./_generated/api"
import { cronJobs } from "convex/server"

// Define the cron job schedule
export const crons = cronJobs()

// Add a cron job to aggregate analytics data every 5 minutes
crons.interval("aggregate-analytics-data", { minutes: 5 }, internal.realTimeAnalytics.aggregateAnalyticsData)

// Store real-time analytics event
export const trackEvent = mutation({
  args: {
    orgId: v.string(),
    eventType: v.string(),
    eventData: v.object({}),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Insert event into real-time events table
    const eventId = await ctx.db.insert("realTimeEvents", {
      orgId: args.orgId,
      eventType: args.eventType,
      eventData: args.eventData,
      userId: args.userId,
      timestamp: now,
      processed: false,
    })

    // Also insert into analytics events for long-term storage
    await ctx.db.insert("analyticsEvents", {
      orgId: args.orgId,
      eventType: args.eventType,
      eventData: args.eventData,
      userId: args.userId,
      timestamp: now,
    })

    return eventId
  },
})

// Get real-time metrics for the current day
export const getRealTimeMetrics = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = requireOrgRole(ctx, args.orgId, ["admin", "member"])

    // Get the start of the current day
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

    // Get the latest aggregated metrics
    const latestMetrics = await ctx.db
      .query("realTimeMetrics")
      .withIndex("by_orgId_and_date", (q) => q.eq("orgId", orgId).eq("date", startOfDay))
      .first()

    // Get recent events that might not be in the aggregated metrics yet
    const recentEvents = await ctx.db
      .query("realTimeEvents")
      .withIndex("by_orgId_and_timestamp", (q) =>
        q.eq("orgId", orgId).gt("timestamp", latestMetrics?.lastUpdated || startOfDay),
      )
      .collect()

    // Calculate metrics from recent events
    const eventCounts: Record<string, number> = {}
    const revenueTotal = { amount: 0 }
    const activeUsers = new Set<string>()

    for (const event of recentEvents) {
      // Count events by type
      eventCounts[event.eventType] = (eventCounts[event.eventType] || 0) + 1

      // Track revenue
      if (event.eventType === "payment_received" && event.eventData.amount) {
        revenueTotal.amount += event.eventData.amount
      }

      // Track active users
      if (event.userId) {
        activeUsers.add(event.userId)
      }
    }

    // Combine with aggregated metrics
    const result = {
      date: startOfDay,
      totalAppointments: (latestMetrics?.totalAppointments || 0) + (eventCounts["appointment_created"] || 0),
      totalRevenue: (latestMetrics?.totalRevenue || 0) + revenueTotal.amount,
      activeUsers: (latestMetrics?.activeUsers || 0) + activeUsers.size,
      assessmentsCompleted: (latestMetrics?.assessmentsCompleted || 0) + (eventCounts["assessment_completed"] || 0),
      lastUpdated: now.getTime(),
    }

    return result
  },
})

// Get real-time activity feed
export const getActivityFeed = query({
  args: {
    orgId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { orgId } = requireOrgRole(ctx, args.orgId, ["admin", "member"])
    const limit = args.limit || 20

    // Get recent events
    const recentEvents = await ctx.db
      .query("realTimeEvents")
      .withIndex("by_orgId_and_timestamp", (q) => q.eq("orgId", orgId))
      .order("desc")
      .take(limit)

    // Format events for display
    const activityFeed = await Promise.all(
      recentEvents.map(async (event) => {
        let actorName = "System"
        let targetName = ""

        // Get user name if available
        if (event.userId) {
          const user = await ctx.db
            .query("users")
            .withIndex("by_clerkId", (q) => q.eq("clerkId", event.userId))
            .first()

          if (user) {
            actorName = user.name || user.email || "Unknown User"
          }
        }

        // Get target name if available
        if (event.eventData.clientId) {
          const client = await ctx.db.get(event.eventData.clientId)
          if (client) {
            targetName = client.name
          }
        } else if (event.eventData.vehicleId) {
          const vehicle = await ctx.db.get(event.eventData.vehicleId)
          if (vehicle) {
            targetName = `${vehicle.year} ${vehicle.make} ${vehicle.model}`
          }
        }

        // Format message based on event type
        let message = ""
        let icon = "activity"

        switch (event.eventType) {
          case "appointment_created":
            message = `created an appointment`
            icon = "calendar"
            break
          case "assessment_completed":
            message = `completed an assessment for`
            icon = "clipboard-check"
            break
          case "payment_received":
            message = `received payment of $${event.eventData.amount} from`
            icon = "credit-card"
            break
          case "client_created":
            message = `added a new client:`
            icon = "user-plus"
            break
          case "vehicle_created":
            message = `added a new vehicle for`
            icon = "car"
            break
          default:
            message = `performed action: ${event.eventType}`
        }

        return {
          id: event._id,
          timestamp: event.timestamp,
          actor: actorName,
          action: message,
          target: targetName,
          icon,
          data: event.eventData,
        }
      }),
    )

    return activityFeed
  },
})

// Internal function to aggregate analytics data (called by cron job)
export const aggregateAnalyticsData = mutation({
  args: {},
  handler: async (ctx) => {
    // Get all organizations
    const orgs = await ctx.db.query("tenants").collect()

    for (const org of orgs) {
      // Get the start of the current day
      const now = new Date()
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()

      // Get existing metrics for today
      const existingMetrics = await ctx.db
        .query("realTimeMetrics")
        .withIndex("by_orgId_and_date", (q) => q.eq("orgId", org.orgId).eq("date", startOfDay))
        .first()

      // Get unprocessed events
      const unprocessedEvents = await ctx.db
        .query("realTimeEvents")
        .withIndex("by_orgId_and_processed", (q) => q.eq("orgId", org.orgId).eq("processed", false))
        .collect()

      if (unprocessedEvents.length === 0 && existingMetrics) {
        continue // No new events to process
      }

      // Calculate metrics from events
      const eventCounts: Record<string, number> = {}
      const revenueTotal = { amount: 0 }
      const activeUsers = new Set<string>()

      for (const event of unprocessedEvents) {
        // Count events by type
        eventCounts[event.eventType] = (eventCounts[event.eventType] || 0) + 1

        // Track revenue
        if (event.eventType === "payment_received" && event.eventData.amount) {
          revenueTotal.amount += event.eventData.amount
        }

        // Track active users
        if (event.userId) {
          activeUsers.add(event.userId)
        }

        // Mark event as processed
        await ctx.db.patch(event._id, { processed: true })
      }

      // Update or create metrics
      if (existingMetrics) {
        await ctx.db.patch(existingMetrics._id, {
          totalAppointments: existingMetrics.totalAppointments + (eventCounts["appointment_created"] || 0),
          totalRevenue: existingMetrics.totalRevenue + revenueTotal.amount,
          activeUsers: existingMetrics.activeUsers + activeUsers.size,
          assessmentsCompleted: existingMetrics.assessmentsCompleted + (eventCounts["assessment_completed"] || 0),
          lastUpdated: now.getTime(),
        })
      } else {
        await ctx.db.insert("realTimeMetrics", {
          orgId: org.orgId,
          date: startOfDay,
          totalAppointments: eventCounts["appointment_created"] || 0,
          totalRevenue: revenueTotal.amount,
          activeUsers: activeUsers.size,
          assessmentsCompleted: eventCounts["assessment_completed"] || 0,
          lastUpdated: now.getTime(),
        })
      }
    }

    return { success: true, processedCount: orgs.length }
  },
})

// Get real-time dashboard data
export const getDashboardData = query({
  args: {
    orgId: v.string(),
  },
  handler: async (ctx, args) => {
    const { orgId } = requireOrgRole(ctx, args.orgId, ["admin", "member"])

    // Get real-time metrics
    const metrics = await ctx.runQuery(internal.realTimeAnalytics.getRealTimeMetrics, { orgId })

    // Get activity feed
    const activityFeed = await ctx.runQuery(internal.realTimeAnalytics.getActivityFeed, { orgId, limit: 10 })

    // Get active users
    const now = Date.now()
    const fiveMinutesAgo = now - 5 * 60 * 1000

    const activeUsers = await ctx.db
      .query("realTimeEvents")
      .withIndex("by_orgId_and_timestamp", (q) => q.eq("orgId", orgId).gt("timestamp", fiveMinutesAgo))
      .filter((q) => q.neq(q.field("userId"), undefined))
      .collect()
      .then((events) => {
        const uniqueUsers = new Set(events.map((e) => e.userId))
        return Array.from(uniqueUsers).length
      })

    return {
      metrics,
      activityFeed,
      activeUsers,
      lastUpdated: now,
    }
  },
})
