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

    // If reminders are provided, update the eventReminders table
    if (args.reminders && args.reminders.length > 0) {
      // First, get existing reminders for this event
      const existingReminders = await ctx.db
        .query("eventReminders")
        .withIndex("by_eventId", (q) => q.eq("eventId", eventId))
        .collect()

      // Create a map of existing reminder IDs
      const existingReminderMap = new Map(existingReminders.map((r) => [r.reminderId, r]))

      // Process each reminder
      for (const reminder of args.reminders) {
        const scheduledTime = args.startTime - reminder.minutes * 60 * 1000

        if (existingReminderMap.has(reminder.id)) {
          // Update existing reminder
          const existingReminder = existingReminderMap.get(reminder.id)!
          await ctx.db.patch(existingReminder._id, {
            method: reminder.method,
            minutes: reminder.minutes,
            scheduledTime,
            sent: reminder.sent || false,
            sentAt: reminder.sentAt,
          })
          // Remove from map to track which ones to delete
          existingReminderMap.delete(reminder.id)
        } else {
          // Create new reminder
          await ctx.db.insert("eventReminders", {
            eventId,
            reminderId: reminder.id,
            method: reminder.method,
            minutes: reminder.minutes,
            scheduledTime,
            sent: reminder.sent || false,
            sentAt: reminder.sentAt,
            recipientEmail: args.attendees?.[0], // Default to first attendee
            orgId,
            createdAt: now,
          })
        }
      }

      // Delete reminders that no longer exist
      for (const [_, reminder] of existingReminderMap) {
        await ctx.db.delete(reminder._id)
      }
    }

    return eventId
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

export const addReminder = mutation({
  args: {
    eventId: v.id("calendarEvents"),
    method: v.string(),
    minutes: v.number(),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx)
    const event = await ctx.db.get(args.eventId)

    if (!event || event.orgId !== orgId) {
      throw new Error("Event not found or access denied")
    }

    const now = Date.now()
    const reminderId = `reminder_${now}_${Math.random().toString(36).substring(2, 9)}`
    const scheduledTime = event.startTime - args.minutes * 60 * 1000

    // Add to the reminders array in the event
    const reminders = event.reminders || []
    reminders.push({
      id: reminderId,
      method: args.method,
      minutes: args.minutes,
      sent: false,
    })

    await ctx.db.patch(args.eventId, {
      reminders,
      updatedAt: now,
    })

    // Create entry in eventReminders table
    await ctx.db.insert("eventReminders", {
      eventId: args.eventId,
      reminderId,
      method: args.method,
      minutes: args.minutes,
      scheduledTime,
      sent: false,
      recipientEmail: event.attendees?.[0], // Default to first attendee
      orgId,
      createdAt: now,
    })

    // If this is a Google Calendar event, update the reminders in Google Calendar
    if (event.integrationId) {
      // Schedule a background task to update Google Calendar
      await ctx.scheduler.runAfter(0, "calendarIntegration:syncEventReminders", {
        eventId: args.eventId,
      })
    }

    return reminderId
  },
})

export const removeReminder = mutation({
  args: {
    eventId: v.id("calendarEvents"),
    reminderId: v.string(),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx)
    const event = await ctx.db.get(args.eventId)

    if (!event || event.orgId !== orgId) {
      throw new Error("Event not found or access denied")
    }

    // Remove from the reminders array in the event
    const reminders = (event.reminders || []).filter((r) => r.id !== args.reminderId)

    await ctx.db.patch(args.eventId, {
      reminders,
      updatedAt: Date.now(),
    })

    // Delete from eventReminders table
    const reminderRecord = await ctx.db
      .query("eventReminders")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("reminderId"), args.reminderId))
      .first()

    if (reminderRecord) {
      await ctx.db.delete(reminderRecord._id)
    }

    // If this is a Google Calendar event, update the reminders in Google Calendar
    if (event.integrationId) {
      // Schedule a background task to update Google Calendar
      await ctx.scheduler.runAfter(0, "calendarIntegration:syncEventReminders", {
        eventId: args.eventId,
      })
    }

    return true
  },
})

export const updateReminder = mutation({
  args: {
    eventId: v.id("calendarEvents"),
    reminderId: v.string(),
    method: v.string(),
    minutes: v.number(),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx)
    const event = await ctx.db.get(args.eventId)

    if (!event || event.orgId !== orgId) {
      throw new Error("Event not found or access denied")
    }

    const now = Date.now()
    const scheduledTime = event.startTime - args.minutes * 60 * 1000

    // Update in the reminders array in the event
    const reminders = event.reminders || []
    const reminderIndex = reminders.findIndex((r) => r.id === args.reminderId)

    if (reminderIndex === -1) {
      throw new Error("Reminder not found")
    }

    reminders[reminderIndex] = {
      ...reminders[reminderIndex],
      method: args.method,
      minutes: args.minutes,
    }

    await ctx.db.patch(args.eventId, {
      reminders,
      updatedAt: now,
    })

    // Update in eventReminders table
    const reminderRecord = await ctx.db
      .query("eventReminders")
      .withIndex("by_eventId", (q) => q.eq("eventId", args.eventId))
      .filter((q) => q.eq(q.field("reminderId"), args.reminderId))
      .first()

    if (reminderRecord) {
      await ctx.db.patch(reminderRecord._id, {
        method: args.method,
        minutes: args.minutes,
        scheduledTime,
      })
    }

    // If this is a Google Calendar event, update the reminders in Google Calendar
    if (event.integrationId) {
      // Schedule a background task to update Google Calendar
      await ctx.scheduler.runAfter(0, "calendarIntegration:syncEventReminders", {
        eventId: args.eventId,
      })
    }

    return true
  },
})

export const getUserReminderPreferences = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }

    const orgId = identity.tokenIdentifier.split("|")[1].split(":")[0]
    const userId = identity.subject

    // Get user record
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", userId))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    // Get user reminder preferences
    const preferences = await ctx.db
      .query("userReminderPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("orgId"), orgId))
      .first()

    if (!preferences) {
      // Return default preferences
      return {
        defaultReminders: [
          { method: "email", minutes: 60 },
          { method: "popup", minutes: 10 },
        ],
        emailEnabled: true,
        smsEnabled: false,
        popupEnabled: true,
      }
    }

    return preferences
  },
})

export const updateUserReminderPreferences = mutation({
  args: {
    defaultReminders: v.array(
      v.object({
        method: v.string(),
        minutes: v.number(),
      }),
    ),
    emailEnabled: v.boolean(),
    smsEnabled: v.boolean(),
    popupEnabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }

    const orgId = identity.tokenIdentifier.split("|")[1].split(":")[0]
    const userId = identity.subject

    // Get user record
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", userId))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    const now = Date.now()

    // Check if preferences already exist
    const existingPrefs = await ctx.db
      .query("userReminderPreferences")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("orgId"), orgId))
      .first()

    if (existingPrefs) {
      // Update existing preferences
      await ctx.db.patch(existingPrefs._id, {
        defaultReminders: args.defaultReminders,
        emailEnabled: args.emailEnabled,
        smsEnabled: args.smsEnabled,
        popupEnabled: args.popupEnabled,
        updatedAt: now,
      })
      return existingPrefs._id
    } else {
      // Create new preferences
      return await ctx.db.insert("userReminderPreferences", {
        userId: user._id,
        orgId,
        defaultReminders: args.defaultReminders,
        emailEnabled: args.emailEnabled,
        smsEnabled: args.smsEnabled,
        popupEnabled: args.popupEnabled,
        createdAt: now,
        updatedAt: now,
      })
    }
  },
})

export const getPendingReminders = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    // Get reminders that are due but not sent yet
    return await ctx.db
      .query("eventReminders")
      .withIndex("by_sent_scheduledTime", (q) => q.eq("sent", false).lte("scheduledTime", now))
      .collect()
  },
})

export const markReminderSent = mutation({
  args: {
    reminderId: v.id("eventReminders"),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    await ctx.db.patch(args.reminderId, {
      sent: true,
      sentAt: now,
    })

    // Also update the sent status in the event's reminders array
    const reminder = await ctx.db.get(args.reminderId)
    if (reminder) {
      const event = await ctx.db.get(reminder.eventId)
      if (event && event.reminders) {
        const updatedReminders = event.reminders.map((r) => {
          if (r.id === reminder.reminderId) {
            return { ...r, sent: true, sentAt: now }
          }
          return r
        })

        await ctx.db.patch(reminder.eventId, {
          reminders: updatedReminders,
        })
      }
    }

    return true
  },
})
