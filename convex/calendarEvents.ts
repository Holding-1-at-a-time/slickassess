import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireOrgId } from "./utils/auth"
import type { Id } from "./_generated/dataModel"

export const upsertEvent = mutation({
  args: {
    integrationId: v.id("calendarIntegrations"),
    externalId: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    location: v.optional(v.string()),
    attendees: v.optional(v.array(v.string())),
    assessmentId: v.optional(v.id("assessments")),
    vehicleId: v.optional(v.id("vehicles")),
    clientId: v.optional(v.id("clients")),
    reminders: v.optional(
      v.array(
        v.object({
          id: v.string(),
          method: v.string(),
          minutes: v.number(),
          sent: v.optional(v.boolean()),
          sentAt: v.optional(v.number()),
        }),
      ),
    ),
    defaultRemindersEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx)

    // Verify the integration belongs to this org
    const integration = await ctx.db.get(args.integrationId)
    if (!integration || integration.orgId !== orgId) {
      throw new Error("Calendar integration not found or access denied")
    }

    const now = Date.now()

    // Check if event already exists
    const existingEvent = await ctx.db
      .query("calendarEvents")
      .withIndex("by_externalId", (q) => q.eq("externalId", args.externalId))
      .first()

    let eventId: Id<"calendarEvents">

    if (existingEvent) {
      // Update existing event
      await ctx.db.patch(existingEvent._id, {
        title: args.title,
        description: args.description,
        startTime: args.startTime,
        endTime: args.endTime,
        location: args.location,
        attendees: args.attendees,
        assessmentId: args.assessmentId,
        vehicleId: args.vehicleId,
        clientId: args.clientId,
        reminders: args.reminders,
        defaultRemindersEnabled: args.defaultRemindersEnabled,
        updatedAt: now,
      })
      eventId = existingEvent._id
    } else {
      // Create new event
      eventId = await ctx.db.insert("calendarEvents", {
        integrationId: args.integrationId,
        externalId: args.externalId,
        title: args.title,
        description: args.description,
        startTime: args.startTime,
        endTime: args.endTime,
        location: args.location,
        attendees: args.attendees,
        assessmentId: args.assessmentId,
        vehicleId: args.vehicleId,
        clientId: args.clientId,
        reminders: args.reminders,
        defaultRemindersEnabled: args.defaultRemindersEnabled,
        orgId,
        createdAt: now,
        updatedAt: now,
      })
    }

    return eventId
  },
})

export const getEventById = query({
  args: {
    eventId: v.id("calendarEvents"),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx)
    const event = await ctx.db.get(args.eventId)

    if (!event || event.orgId !== orgId) {
      return null
    }

    return event
  },
})

export const deleteEvent = mutation({
  args: {
    eventId: v.id("calendarEvents"),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx)
    const event = await ctx.db.get(args.eventId)

    if (!event || event.orgId !== orgId) {
      throw new Error("Event not found or access denied")
    }

    await ctx.db.delete(args.eventId)
    return true
  },
})

export const getUpcomingEvents = query({
  args: {
    days: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx)
    const now = Date.now()
    const daysInMs = (args.days || 7) * 24 * 60 * 60 * 1000
    const endTime = now + daysInMs

    return await ctx.db
      .query("calendarEvents")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .filter((q) => q.gte(q.field("startTime"), now).lt(q.field("startTime"), endTime))
      .order("asc")
      .collect()
  },
})
