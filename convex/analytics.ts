import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireOrgRole } from "./utils/auth"

// Log an analytics event
export const logEvent = mutation({
  args: {
    orgId: v.string(),
    eventType: v.string(),
    eventData: v.object({}),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Validate the organization ID
    const { orgId } = requireOrgRole(ctx, args.orgId, ["admin", "member"])

    // Insert event into Convex database
    const eventId = await ctx.db.insert("analyticsEvents", {
      orgId,
      eventType: args.eventType,
      eventData: args.eventData,
      userId: args.userId,
      timestamp: now,
    })

    // Log to BigQuery via HTTP action
    try {
      await ctx.scheduler.runAfter(0, "scheduled-jobs:logEventToBigQuery", {
        orgId,
        eventType: args.eventType,
        eventData: args.eventData,
        userId: args.userId,
        timestamp: now,
        eventId,
      })
    } catch (error) {
      // Log error but don't fail the request
      console.error("Failed to schedule BigQuery logging:", error)
    }

    return eventId
  },
})

// Get appointments per day for the last 30 days
export const getAppointmentsPerDay = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const { orgId } = requireOrgRole(ctx, args.orgId, ["admin", "member"])

    // In a real implementation, this would query BigQuery
    // For now, we'll generate sample data
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000

    // Get appointment creation events from the last 30 days
    const events = await ctx.db
      .query("analyticsEvents")
      .withIndex("by_orgId_eventType", (q) => q.eq("orgId", orgId).eq("eventType", "appointment_created"))
      .filter((q) => q.gte(q.field("timestamp"), thirtyDaysAgo))
      .collect()

    // Group by day
    const appointmentsByDay = new Map()

    // Initialize all days with 0 appointments
    for (let i = 0; i < 30; i++) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const dateString = date.toISOString().split("T")[0]
      appointmentsByDay.set(dateString, 0)
    }

    // Count appointments per day
    for (const event of events) {
      const date = new Date(event.timestamp)
      const dateString = date.toISOString().split("T")[0]

      if (appointmentsByDay.has(dateString)) {
        appointmentsByDay.set(dateString, appointmentsByDay.get(dateString) + 1)
      }
    }

    // Convert to array for the frontend
    const result = Array.from(appointmentsByDay.entries()).map(([date, count]) => ({
      date,
      count,
    }))

    // Sort by date
    result.sort((a, b) => a.date.localeCompare(b.date))

    return result
  },
})

// Get revenue per month for the last 12 months
export const getRevenuePerMonth = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const { orgId } = requireOrgRole(ctx, args.orgId, ["admin"])

    // In a real implementation, this would query BigQuery
    // For now, we'll generate sample data based on invoices
    const twelveMonthsAgo = Date.now() - 12 * 30 * 24 * 60 * 60 * 1000

    // Get paid invoices from the last 12 months
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_orgId_createdAt", (q) => q.eq("orgId", orgId))
      .filter((q) => q.gte(q.field("createdAt"), twelveMonthsAgo))
      .collect()

    // Group by month
    const revenueByMonth = new Map()

    // Initialize all months with 0 revenue
    for (let i = 0; i < 12; i++) {
      const date = new Date()
      date.setMonth(date.getMonth() - i)
      const monthString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`
      revenueByMonth.set(monthString, 0)
    }

    // Sum revenue per month
    for (const invoice of invoices) {
      const date = new Date(invoice.createdAt)
      const monthString = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`

      if (revenueByMonth.has(monthString)) {
        revenueByMonth.set(monthString, revenueByMonth.get(monthString) + invoice.amount)
      }
    }

    // Convert to array for the frontend
    const result = Array.from(revenueByMonth.entries()).map(([month, revenue]) => ({
      month,
      revenue,
    }))

    // Sort by month
    result.sort((a, b) => a.month.localeCompare(b.month))

    return result
  },
})

// Get top clients by revenue
export const getTopClientsByRevenue = query({
  args: { orgId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { orgId } = requireOrgRole(ctx, args.orgId, ["admin"])
    const limit = args.limit || 5

    // Get all invoices for this organization
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_orgId_createdAt", (q) => q.eq("orgId", orgId))
      .collect()

    // Group by client
    const revenueByClient = new Map()

    // Sum revenue per client
    for (const invoice of invoices) {
      const clientId = invoice.clientId
      const currentRevenue = revenueByClient.get(clientId) || 0
      revenueByClient.set(clientId, currentRevenue + invoice.amount)
    }

    // Convert to array and sort by revenue
    const sortedClients = Array.from(revenueByClient.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)

    // Get client details
    const result = []
    for (const [clientId, revenue] of sortedClients) {
      const client = await ctx.db.get(clientId)
      if (client) {
        result.push({
          clientId,
          name: client.name,
          revenue,
        })
      }
    }

    return result
  },
})

// Get service popularity
export const getServicePopularity = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const { orgId } = requireOrgRole(ctx, args.orgId, ["admin", "member"])

    // Get all appointments for this organization
    const appointments = await ctx.db
      .query("appointments")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .collect()

    // Count service occurrences
    const serviceCount = new Map()

    // Count each service
    for (const appointment of appointments) {
      if (appointment.serviceId) {
        const currentCount = serviceCount.get(appointment.serviceId) || 0
        serviceCount.set(appointment.serviceId, currentCount + 1)
      }
    }

    // Convert to array and sort by count
    const sortedServices = Array.from(serviceCount.entries()).sort((a, b) => b[1] - a[1])

    // Get service details
    const result = []
    for (const [serviceId, count] of sortedServices) {
      const service = await ctx.db.get(serviceId)
      if (service) {
        result.push({
          serviceId,
          name: service.name,
          count,
        })
      }
    }

    return result
  },
})
