import { NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/http"
import { api } from "@/convex/_generated/api"

// Helper function to send an email
async function sendEmail(options: { to: string; subject: string; html: string }) {
  // Implementation would depend on your email service provider
  // This is a placeholder
  console.log(`Sending email to ${options.to}: ${options.subject}`)
  return true
}

// Helper function to send an SMS
async function sendSMS(options: { to: string; body: string }) {
  // Implementation would depend on your SMS service provider
  // This is a placeholder
  console.log(`Sending SMS to ${options.to}: ${options.body}`)
  return true
}

// Vercel Cron job that runs every hour
export async function GET(request: Request) {
  try {
    // Security check - in production, validate a secret token
    const url = new URL(request.url)
    const secret = url.searchParams.get("secret")
    const expectedSecret = process.env.CRON_SECRET

    if (secret !== expectedSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Initialize Convex client with admin key for cross-org access
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL!
    const convexAdminKey = process.env.CONVEX_ADMIN_KEY!
    const client = new ConvexHttpClient(convexUrl)

    // Fetch all appointments that need reminders
    const toRemind = await client.query(api.appointments.getAppointmentsForReminder)

    let successCount = 0
    let errorCount = 0

    // Process each appointment
    for (const appt of toRemind) {
      try {
        // Fetch client preferences
        const pref = await client.query(api.userClientPreferences.getByClientId, {
          clientId: appt.clientId,
        })

        // Skip if client has opted out of reminders
        if (pref.communicationPreference === "none") continue

        // Fetch notification template
        const template = await client.query(api.notificationTemplates.getByType, {
          orgId: appt.orgId,
          type: "appointmentReminder",
          channel: pref.communicationPreference,
        })

        // Skip if no active template exists
        if (!template || !template.active) continue

        // Format appointment date
        const appointmentDate = new Date(appt.appointmentDate).toLocaleString()

        // Personalize message
        const subject = template.subject.replace("{date}", appointmentDate)
        const body = template.body
          .replace("{name}", appt.clientName)
          .replace("{date}", appointmentDate)
          .replace("{service}", appt.serviceName)

        // Send notification based on preference
        if (pref.communicationPreference === "email") {
          await sendEmail({
            to: appt.clientEmail,
            subject,
            html: body,
          })
        } else if (pref.communicationPreference === "sms") {
          await sendSMS({
            to: appt.clientPhone,
            body: body.replace(/<[^>]*>/g, ""), // Strip HTML for SMS
          })
        }

        // Mark reminder as sent
        await client.mutation(api.appointments.markReminderSent, {
          appointmentId: appt._id,
        })

        successCount++
      } catch (err) {
        console.error(`Error processing reminder for appointment ${appt._id}:`, err)
        errorCount++
      }
    }

    return NextResponse.json({
      success: true,
      processed: toRemind.length,
      successful: successCount,
      failed: errorCount,
    })
  } catch (error) {
    console.error("Error in reminder job:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
