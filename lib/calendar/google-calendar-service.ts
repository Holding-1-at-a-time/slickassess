import { google } from "googleapis"
import { ConvexHttpClient } from "convex/http"
import { api } from "@/convex/_generated/api"

/**
 * Comprehensive Google Calendar service with token management and error handling
 */
export class GoogleCalendarService {
  private oauth2Client: any
  private convexClient: ConvexHttpClient
  private readonly clientId: string
  private readonly clientSecret: string
  private readonly redirectUri: string

  constructor(convexUrl: string, authToken?: string) {
    this.clientId = process.env.GOOGLE_CLIENT_ID!
    this.clientSecret = process.env.GOOGLE_CLIENT_SECRET!
    this.redirectUri = `${process.env.NEXT_PUBLIC_APP_URL}/api/calendar/callback`

    this.oauth2Client = new google.auth.OAuth2(this.clientId, this.clientSecret, this.redirectUri)

    this.convexClient = new ConvexHttpClient(convexUrl)
    if (authToken) {
      this.convexClient.setAuth(authToken)
    }
  }

  /**
   * Generate authorization URL for OAuth flow
   */
  generateAuthUrl(userId: string, orgId: string): string {
    const state = Buffer.from(
      JSON.stringify({
        userId,
        orgId,
        timestamp: Date.now(),
        nonce: Math.random().toString(36).substring(2, 15),
      }),
    ).toString("base64")

    return this.oauth2Client.generateAuthUrl({
      access_type: "offline",
      scope: [
        "https://www.googleapis.com/auth/calendar",
        "https://www.googleapis.com/auth/calendar.events",
        "https://www.googleapis.com/auth/calendar.readonly",
      ],
      state,
      prompt: "consent",
      include_granted_scopes: true,
    })
  }

  /**
   * Exchange authorization code for tokens
   */
  async exchangeCodeForTokens(code: string, state: string): Promise<TokenExchangeResult> {
    try {
      // Validate and parse state
      const stateData = this.validateState(state)

      // Exchange code for tokens
      const { tokens } = await this.oauth2Client.getToken(code)

      if (!tokens.access_token || !tokens.refresh_token) {
        throw new Error("Invalid tokens received from Google")
      }

      // Store tokens in database
      await this.storeTokens(stateData.userId, stateData.orgId, tokens)

      return {
        success: true,
        userId: stateData.userId,
        orgId: stateData.orgId,
        tokens,
      }
    } catch (error) {
      console.error("Error exchanging code for tokens:", error)
      throw new CalendarIntegrationError("Failed to exchange authorization code", error)
    }
  }

  /**
   * Get user's calendar integration with token refresh
   */
  async getUserIntegration(userId: string): Promise<CalendarIntegration | null> {
    try {
      const integration = await this.convexClient.query(api.calendarIntegration.getByUserId, { userId })

      if (!integration) {
        return null
      }

      // Check if tokens need refresh
      if (this.isTokenExpired(integration.tokenExpiry)) {
        const refreshedIntegration = await this.refreshTokens(integration)
        return refreshedIntegration
      }

      return integration
    } catch (error) {
      console.error("Error getting user integration:", error)
      throw new CalendarIntegrationError("Failed to get calendar integration", error)
    }
  }

  /**
   * Refresh access tokens
   */
  async refreshTokens(integration: CalendarIntegration): Promise<CalendarIntegration> {
    try {
      this.oauth2Client.setCredentials({
        refresh_token: integration.refreshToken,
        access_token: integration.accessToken,
        expiry_date: integration.tokenExpiry,
      })

      const { credentials } = await this.oauth2Client.refreshAccessToken()

      if (!credentials.access_token) {
        throw new Error("Failed to refresh access token")
      }

      // Update tokens in database
      await this.convexClient.mutation(api.calendarIntegration.upsert, {
        userId: integration.userId,
        orgId: integration.orgId,
        provider: "google",
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token || integration.refreshToken,
        tokenExpiry: credentials.expiry_date || Date.now() + 3600000,
        calendarId: integration.calendarId,
        syncEnabled: integration.syncEnabled,
        lastSynced: integration.lastSynced,
      })

      return {
        ...integration,
        accessToken: credentials.access_token,
        refreshToken: credentials.refresh_token || integration.refreshToken,
        tokenExpiry: credentials.expiry_date || Date.now() + 3600000,
      }
    } catch (error) {
      console.error("Error refreshing tokens:", error)

      // If refresh fails, the user needs to re-authorize
      if (error.code === 400 || error.message?.includes("invalid_grant")) {
        await this.revokeIntegration(integration.userId)
        throw new CalendarIntegrationError("Calendar integration expired. Please reconnect.", error)
      }

      throw new CalendarIntegrationError("Failed to refresh calendar tokens", error)
    }
  }

  /**
   * Sync events from Google Calendar
   */
  async syncEvents(userId: string, options: SyncOptions = {}): Promise<SyncResult> {
    try {
      const integration = await this.getUserIntegration(userId)

      if (!integration || !integration.syncEnabled) {
        throw new Error("Calendar integration not found or sync disabled")
      }

      // Set up authenticated client
      this.oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
        expiry_date: integration.tokenExpiry,
      })

      const calendar = google.calendar({ version: "v3", auth: this.oauth2Client })

      // Calculate time range
      const timeMin = options.startDate || new Date()
      const timeMax = options.endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now

      // Fetch events from Google Calendar
      const response = await calendar.events.list({
        calendarId: integration.calendarId,
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        singleEvents: true,
        orderBy: "startTime",
        maxResults: options.maxResults || 250,
      })

      const events = response.data.items || []
      const syncedEvents: string[] = []
      const errors: SyncError[] = []

      // Process each event
      for (const event of events) {
        try {
          if (!event.id || !event.summary) {
            continue
          }

          const eventId = await this.convexClient.mutation(api.calendarEvents.upsertEvent, {
            integrationId: integration._id,
            externalId: event.id,
            title: event.summary,
            description: event.description || undefined,
            startTime: this.parseEventTime(event.start),
            endTime: this.parseEventTime(event.end),
            location: event.location || undefined,
            attendees: event.attendees?.map((a) => a.email || "").filter(Boolean) || undefined,
            reminders: this.parseReminders(event.reminders),
            defaultRemindersEnabled: event.reminders?.useDefault || false,
          })

          syncedEvents.push(eventId)
        } catch (error) {
          errors.push({
            eventId: event.id || "unknown",
            error: error.message || "Unknown error",
          })
        }
      }

      // Update last synced timestamp
      await this.convexClient.mutation(api.calendarIntegration.updateLastSynced, {
        integrationId: integration._id,
      })

      return {
        success: true,
        syncedCount: syncedEvents.length,
        totalEvents: events.length,
        errors,
        lastSynced: new Date().toISOString(),
      }
    } catch (error) {
      console.error("Error syncing calendar events:", error)
      throw new CalendarIntegrationError("Failed to sync calendar events", error)
    }
  }

  /**
   * Create event in Google Calendar
   */
  async createEvent(userId: string, eventData: CreateEventData): Promise<string> {
    try {
      const integration = await this.getUserIntegration(userId)

      if (!integration) {
        throw new Error("Calendar integration not found")
      }

      this.oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
        expiry_date: integration.tokenExpiry,
      })

      const calendar = google.calendar({ version: "v3", auth: this.oauth2Client })

      const event = {
        summary: eventData.title,
        description: eventData.description,
        start: {
          dateTime: new Date(eventData.startTime).toISOString(),
          timeZone: eventData.timeZone || "UTC",
        },
        end: {
          dateTime: new Date(eventData.endTime).toISOString(),
          timeZone: eventData.timeZone || "UTC",
        },
        location: eventData.location,
        attendees: eventData.attendees?.map((email) => ({ email })),
        reminders: {
          useDefault: false,
          overrides:
            eventData.reminders?.map((r) => ({
              method: r.method,
              minutes: r.minutes,
            })) || [],
        },
      }

      const response = await calendar.events.insert({
        calendarId: integration.calendarId,
        requestBody: event,
      })

      if (!response.data.id) {
        throw new Error("Failed to create event in Google Calendar")
      }

      // Store event in our database
      await this.convexClient.mutation(api.calendarEvents.upsertEvent, {
        integrationId: integration._id,
        externalId: response.data.id,
        title: eventData.title,
        description: eventData.description,
        startTime: eventData.startTime,
        endTime: eventData.endTime,
        location: eventData.location,
        attendees: eventData.attendees,
        reminders: eventData.reminders,
        defaultRemindersEnabled: false,
      })

      return response.data.id
    } catch (error) {
      console.error("Error creating calendar event:", error)
      throw new CalendarIntegrationError("Failed to create calendar event", error)
    }
  }

  /**
   * Update event in Google Calendar
   */
  async updateEvent(userId: string, eventId: string, eventData: Partial<CreateEventData>): Promise<void> {
    try {
      const integration = await this.getUserIntegration(userId)

      if (!integration) {
        throw new Error("Calendar integration not found")
      }

      this.oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
        expiry_date: integration.tokenExpiry,
      })

      const calendar = google.calendar({ version: "v3", auth: this.oauth2Client })

      const updateData: any = {}

      if (eventData.title) {
      if (eventData.description) {
      if (eventData.location) updateData.location = eventData.location
      if (eventData.startTime) {
        updateData.start = {
          dateTime: new Date(eventData.startTime).toISOString(),
          timeZone: eventData.timeZone || "UTC",
        }
      }
      if (eventData.endTime) {
        updateData.end = {
          dateTime: new Date(eventData.endTime).toISOString(),
          timeZone: eventData.timeZone || "UTC",
        }
      }
      if (eventData.attendees) {
        updateData.attendees = eventData.attendees.map((email) => ({ email }))
      }
      if (eventData.reminders) {
        updateData.reminders = {
          useDefault: false,
          overrides: eventData.reminders.map((r) => ({
            method: r.method,
            minutes: r.minutes,
          })),
        }
      }

      await calendar.events.patch({
        calendarId: integration.calendarId,
        eventId,
        requestBody: updateData,
      })

      // Update event in our database
      const dbEvent = await this.convexClient.query(api.calendarEvents.getEventById, { eventId })
      if (dbEvent) {
        await this.convexClient.mutation(api.calendarEvents.upsertEvent, {
          integrationId: integration._id,
          externalId: eventId,
          title: eventData.title || dbEvent.title,
          description: eventData.description || dbEvent.description,
          startTime: eventData.startTime || dbEvent.startTime,
          endTime: eventData.endTime || dbEvent.endTime,
          location: eventData.location || dbEvent.location,
          attendees: eventData.attendees || dbEvent.attendees,
          reminders: eventData.reminders || dbEvent.reminders,
          defaultRemindersEnabled: dbEvent.defaultRemindersEnabled,
        })
      }
    } catch (error) {
      console.error("Error updating calendar event:", error)
      throw new CalendarIntegrationError("Failed to update calendar event", error)
    }
  }

  /**
   * Delete event from Google Calendar
   */
  async deleteEvent(userId: string, eventId: string): Promise<void> {
    try {
      const integration = await this.getUserIntegration(userId)

      if (!integration) {
        throw new Error("Calendar integration not found")
      }

      this.oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
        expiry_date: integration.tokenExpiry,
      })

      const calendar = google.calendar({ version: "v3", auth: this.oauth2Client })

      await calendar.events.delete({
        calendarId: integration.calendarId,
        eventId,
      })

      // Remove event from our database
      const dbEvent = await this.convexClient.query(api.calendarEvents.getEventById, { eventId })
      if (dbEvent) {
        await this.convexClient.mutation(api.calendarEvents.deleteEvent, { eventId: dbEvent._id })
      }
    } catch (error) {
      console.error("Error deleting calendar event:", error)
      throw new CalendarIntegrationError("Failed to delete calendar event", error)
    }
  }

  /**
   * Revoke calendar integration
   */
  async revokeIntegration(userId: string): Promise<void> {
    try {
      const integration = await this.convexClient.query(api.calendarIntegration.getByUserId, { userId })

      if (integration) {
        // Revoke tokens with Google
        try {
          await this.oauth2Client.revokeToken(integration.accessToken)
        } catch (error) {
          console.warn("Failed to revoke token with Google:", error)
        }

        // Remove integration from database
        await this.convexClient.mutation(api.calendarIntegration.disconnect, { userId })
      }
    } catch (error) {
      console.error("Error revoking calendar integration:", error)
      throw new CalendarIntegrationError("Failed to revoke calendar integration", error)
    }
  }

  /**
   * Get calendar list
   */
  async getCalendarList(userId: string): Promise<CalendarListItem[]> {
    try {
      const integration = await this.getUserIntegration(userId)

      if (!integration) {
        throw new Error("Calendar integration not found")
      }

      this.oauth2Client.setCredentials({
        access_token: integration.accessToken,
        refresh_token: integration.refreshToken,
        expiry_date: integration.tokenExpiry,
      })

      const calendar = google.calendar({ version: "v3", auth: this.oauth2Client })
      const response = await calendar.calendarList.list()

      return (response.data.items || []).map((cal) => ({
        id: cal.id || "",
        summary: cal.summary || "",
        description: cal.description || "",
        primary: cal.primary || false,
        accessRole: cal.accessRole || "",
      }))
    } catch (error) {
      console.error("Error getting calendar list:", error)
      throw new CalendarIntegrationError("Failed to get calendar list", error)
    }
  }

  // Private helper methods

  private validateState(state: string): StateData {
    try {
      const decoded = Buffer.from(state, "base64").toString()
      const stateData = JSON.parse(decoded)

      // Validate timestamp (10 minute window)
      const now = Date.now()
      if (now - stateData.timestamp > 10 * 60 * 1000) {
        throw new Error("State parameter expired")
      }

      if (!stateData.userId || !stateData.orgId) {
        throw new Error("Invalid state data")
      }

      return stateData
    } catch (error) {
      throw new CalendarIntegrationError("Invalid state parameter", error)
    }
  }

  private async storeTokens(userId: string, orgId: string, tokens: any): Promise<void> {
    await this.convexClient.mutation(api.calendarIntegration.upsert, {
      userId,
      orgId,
      provider: "google",
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      tokenExpiry: tokens.expiry_date,
      calendarId: "primary",
      syncEnabled: true,
      lastSynced: null,
    })
  }

  private isTokenExpired(expiryDate: number): boolean {
    // Add 5 minute buffer
    return Date.now() >= expiryDate - 5 * 60 * 1000
  }

  private parseEventTime(timeData: any): number {
    if (timeData?.dateTime) {
      return new Date(timeData.dateTime).getTime()
    }
    if (timeData?.date) {
      return new Date(timeData.date).getTime()
    }
    return Date.now()
  }

  private parseReminders(reminders: any): Array<{ id: string; method: string; minutes: number }> {
    if (!reminders?.overrides) {

    return reminders.overrides.map((reminder: any, index: number) => ({
      id: `reminder_${index}_${Date.now()}`,
      method: reminder.method || "email",
      minutes: reminder.minutes || 10,
    }))
  }
}

// Custom error class
export class CalendarIntegrationError extends Error {
  public readonly originalError?: any

  constructor(message: string, originalError?: any) {
    super(message)
    this.name = "CalendarIntegrationError"
    this.originalError = originalError
  }
}

// Type definitions
export interface TokenExchangeResult {
  success: boolean
  userId: string
  orgId: string
  tokens: any
}

export interface CalendarIntegration {
  _id: string
  userId: string
  orgId: string
  provider: string
  accessToken: string
  refreshToken: string
  tokenExpiry: number
  calendarId: string
  syncEnabled: boolean
  lastSynced: number | null
}

export interface StateData {
  userId: string
  orgId: string
  timestamp: number
  nonce: string
}

export interface SyncOptions {
  startDate?: Date
  endDate?: Date
  maxResults?: number
}

export interface SyncResult {
  success: boolean
  syncedCount: number
  totalEvents: number
  errors: SyncError[]
  lastSynced: string
}

export interface SyncError {
  eventId: string
  error: string
}

export interface CreateEventData {
  title: string
  description?: string
  startTime: number
  endTime: number
  location?: string
  attendees?: string[]
  reminders?: Array<{ method: string; minutes: number }>
  timeZone?: string
}

export interface CalendarListItem {
  id: string
  summary: string
  description: string
  primary: boolean
  accessRole: string
}
