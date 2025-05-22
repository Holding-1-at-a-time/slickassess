import { mutation, query } from "./_generated/server"
import { v } from "convex/values"

// Get appointments that need reminders
export const getAppointmentsForReminder = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()

    // Find all appointments that:
    // 1. Are confirmed
    // 2. Haven't had a reminder sent yet
    // 3. Are within the reminder window based on client preferences
    const appointments = await ctx.db
      .query("appointments")
      .filter((q) => q.eq(q.field("status"), "confirmed"))
      .filter((q) => q.eq(q.field("reminderSent"), false))
      .collect()

    // For each appointment, check if it's time to send a reminder
    const toRemind = []

    for (const appt of appointments) {
      // Skip if appointment date is in the past
      if (appt.appointmentDate < now) continue

      // Get client preferences
      const clientPrefs = await ctx.db
        .query("userClientPreferences")
        .withIndex("by_clientId_orgId", (q) => q.eq("clientId", appt.clientId).eq("orgId", appt.orgId))
        .first()

      // Default to 24 hours if no preferences
      const reminderTiming = clientPrefs?.reminderTiming || 24

      // Calculate when reminder should be sent
      const reminderTime = appt.appointmentDate - reminderTiming * 60 * 60 * 1000

      // If it's time to send the reminder
      if (reminderTime <= now) {
        // Get client details
        const client = await ctx.db.get(appt.clientId)

        // Get service details
        const service = await ctx.db.get(appt.serviceId)

        toRemind.push({
          _id: appt._id,
          clientId: appt.clientId,
          orgId: appt.orgId,
          appointmentDate: appt.appointmentDate,
          clientName: client?.name || "Client",
          clientEmail: client?.email || "",
          clientPhone: client?.phone || "",
          serviceName: service?.name || "Service",
        })
      }
    }

    return toRemind
  },
})

// Mark a reminder as sent
export const markReminderSent = mutation({
  args: { appointmentId: v.id("appointments") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.appointmentId, {
      reminderSent: true,
      reminderSentAt: Date.now(),
    })
    return true
  },
})
