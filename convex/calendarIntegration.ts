import { mutation, query, action } from "./_generated/server"
import { v } from "convex/values"
import { requireOrgId } from "./utils/auth"
import { internal } from "./_generated/api"

export const upsert = mutation({
  args: {
    userId: v.string(),
    orgId: v.string(),
    provider: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    tokenExpiry: v.number(),
    calendarId: v.string(),
    syncEnabled: v.boolean(),
    lastSynced: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx)
    const now = Date.now()

    // Get user record
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.userId))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    // Upsert by userId & provider
    const existing = await ctx.db
      .query("calendarIntegrations")
      .withIndex("by_user_and_provider", (q) => q.eq("userId", user._id).eq("provider", args.provider))
      .first()

    if (existing) {
      await ctx.db.patch(existing._id, {
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        tokenExpiry: args.tokenExpiry,
        calendarId: args.calendarId,
        syncEnabled: args.syncEnabled,
        lastSynced: args.lastSynced,
        updatedAt: now,
      })
      return existing._id
    } else {
      return await ctx.db.insert("calendarIntegrations", {
        userId: user._id,
        orgId,
        provider: args.provider,
        accessToken: args.accessToken,
        refreshToken: args.refreshToken,
        tokenExpiry: args.tokenExpiry,
        calendarId: args.calendarId,
        syncEnabled: args.syncEnabled,
        lastSynced: args.lastSynced,
        createdAt: now,
        updatedAt: now,
      })
    }
  },
})

export const getByUserId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx)

    // Get user record
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.userId))
      .first()

    if (!user) {
      return null
    }

    const ci = await ctx.db
      .query("calendarIntegrations")
      .withIndex("by_user_and_provider", (q) => q.eq("userId", user._id).eq("provider", "google"))
      .first()

    if (!ci || ci.orgId !== orgId) return null
    return ci
  },
})

export const updateLastSynced = mutation({
  args: {
    integrationId: v.id("calendarIntegrations"),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx)
    const integration = await ctx.db.get(args.integrationId)

    if (!integration || integration.orgId !== orgId) {
      throw new Error("Calendar integration not found or access denied")
    }

    await ctx.db.patch(args.integrationId, {
      lastSynced: Date.now(),
    })

    return true
  },
})

export const toggleSyncEnabled = mutation({
  args: {
    integrationId: v.id("calendarIntegrations"),
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx)
    const integration = await ctx.db.get(args.integrationId)

    if (!integration || integration.orgId !== orgId) {
      throw new Error("Calendar integration not found or access denied")
    }

    await ctx.db.patch(args.integrationId, {
      syncEnabled: args.enabled,
      updatedAt: Date.now(),
    })

    return true
  },
})

export const syncEventReminders = action({
  args: {
    eventId: v.id("calendarEvents"),
  },
  handler: async (ctx, args) => {
    // Get the event
    const event = await ctx.runQuery(internal.calendarEvents.getEventById, {
      eventId: args.eventId,
    })

    if (!event || !event.integrationId) {
      throw new Error("Event not found or not associated with a calendar integration")
    }

    // Get the integration
    const integration = await ctx.runQuery(internal.calendarIntegration.getById, {
      integrationId: event.integrationId,
    })

    if (!integration) {
      throw new Error("Calendar integration not found")
    }

    // Only handle Google Calendar for now
    if (integration.provider !== "google") {
      return { success: false, message: "Only Google Calendar is supported" }
    }

    // Import the Google API client
    const { google } = await import("googleapis")

    // Set up OAuth client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`,
    )

    // Set credentials
    oauth2Client.setCredentials({
      access_token: integration.accessToken,
      refresh_token: integration.refreshToken,
      expiry_date: integration.tokenExpiry,
    })

    // Check if token is expired and refresh if needed
    if (Date.now() >= integration.tokenExpiry) {
      const { credentials } = await oauth2Client.refreshAccessToken()

      // Update tokens in database
      await ctx.runMutation(internal.calendarIntegration.updateTokens, {
        integrationId: integration._id,
        accessToken: credentials.access_token!,
        refreshToken: credentials.refresh_token || integration.refreshToken,
        tokenExpiry: credentials.expiry_date!,
      })

      // Update oauth client with new tokens
      oauth2Client.setCredentials({
        access_token: credentials.access_token,
        refresh_token: credentials.refresh_token || integration.refreshToken,
        expiry_date: credentials.expiry_date,
      })
    }

    // Get the calendar API
    const calendar = google.calendar({ version: "v3", auth: oauth2Client })

    // Format reminders for Google Calendar
    const reminders = {
      useDefault: event.defaultRemindersEnabled || false,
      overrides: event.reminders
        ? event.reminders.map((r) => ({
            method: r.method === "popup" ? "popup" : "email", // Google only supports popup and email
            minutes: r.minutes,
          }))
        : [],
    }

    try {
      // Update the event in Google Calendar
      await calendar.events.patch({
        calendarId: integration.calendarId,
        eventId: event.externalId,
        requestBody: {
          reminders,
        },
      })

      return { success: true }
    } catch (error) {
      console.error("Error updating Google Calendar event reminders:", error)
      return { success: false, error }
    }
  },
})

export const getById = query({
  args: {
    integrationId: v.id("calendarIntegrations"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.integrationId)
  },
})

export const updateTokens = mutation({
  args: {
    integrationId: v.id("calendarIntegrations"),
    accessToken: v.string(),
    refreshToken: v.string(),
    tokenExpiry: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.integrationId, {
      accessToken: args.accessToken,
      refreshToken: args.refreshToken,
      tokenExpiry: args.tokenExpiry,
      updatedAt: Date.now(),
    })
    return true
  },
})
