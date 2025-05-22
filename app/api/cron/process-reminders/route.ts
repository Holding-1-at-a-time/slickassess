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
  console.log(`Sending SMS to ${options.to}: ${options.subject}`)
  return true
}

// Vercel Cron job that runs every 5 minutes
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
    const client = new ConvexHttpClient(convexUrl, convexAdminKey)

    // Fetch all pending reminders
    const pendingReminders = await client.query(api.calendarEvents.getPendingReminders)

    let successCount = 0
    let errorCount = 0

    // Process each reminder
    for (const reminder of pendingReminders) {
      try {
        // Get the event
        const event = await client.query(api.calendarEvents.getEventById, {
          eventId: reminder.eventId,
        })

        if (!event) {
          console.error(`Event not found for reminder ${reminder._id}`)
          continue
        }

        // Get the client and vehicle if associated
        let clientEmail = null
        let clientPhone = null

        if (event.clientId) {
          const clientData = await client.query(api.clients.getById, {
            clientId: event.clientId,
          })
          if (clientData) {
            clientEmail = clientData.email
            clientPhone = clientData.phone
          }
        }

        // Determine recipient
        const recipientEmail = reminder.recipientEmail || clientEmail || event.attendees?.[0]
        const recipientPhone = reminder.recipientPhone || clientPhone

        // Skip if no recipient for the method
        if (reminder.method === "email" && !recipientEmail) {
          console.warn(`No email recipient for reminder ${reminder._id}`)
          continue
        }

        if (reminder.method === "sms" && !recipientPhone) {
          console.warn(`No phone recipient for reminder ${reminder._id}`)
          continue
        }

        // Format the reminder message
        const eventDate = new Date(event.startTime).toLocaleString()
        const subject = `Reminder: ${event.title} at ${eventDate}`
        const body = `
          <h2>Reminder: ${event.title}</h2>
          <p>This is a reminder for your upcoming event:</p>
          <p><strong>Date:</strong> ${eventDate}</p>
          ${event.location ? `<p><strong>Location:</strong> ${event.location}</p>` : ""}
          ${event.description ? `<p><strong>Description:</strong> ${event.description}</p>` : ""}
        `

        // Send the reminder based on method
        if (reminder.method === "email" && recipientEmail) {
          await sendEmail({
            to: recipientEmail,
            subject,
            html: body,
          })
        } else if (reminder.method === "sms" && recipientPhone) {
          await sendSMS({
            to: recipientPhone,
            body: `Reminder: ${event.title} at ${eventDate}`,
          })
        } else if (reminder.method === "popup") {
          // For popup notifications, we would typically store these in a notifications table
          // that the frontend would poll. This is a simplified version.
          await client.mutation(api.notifications.create, {
            userId: event.createdBy,
            type: "reminder",
            title: subject,
            message: `Your event "${event.title}" is starting soon.`,
            link: `/calendar/events/${event._id}`,
            read: false,
          })
        }

        // Mark the reminder as sent
        await client.mutation(api.calendarEvents.markReminderSent, {
          reminderId: reminder._id,
        })

        successCount++
      } catch (err) {
        console.error(`Error processing reminder ${reminder._id}:`, err)
        errorCount++
      }
    }

    return NextResponse.json({
      success: true,
      processed: pendingReminders.length,
      successful: successCount,
      failed: errorCount,
    })
  } catch (error) {
    console.error("Error in reminder processing job:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
