import { NextResponse } from "next/server"
import Stripe from "stripe"
import { ConvexHttpClient } from "convex/http"
import { api } from "@/convex/_generated/api"

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2023-10-16",
})

// Initialize Convex client
const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL || ""
const convexAdminKey = process.env.CONVEX_ADMIN_KEY || ""
const convexClient = new ConvexHttpClient(convexUrl, convexAdminKey)

// Disable body parsing, we need the raw body for Stripe signature verification
export const config = {
  api: {
    bodyParser: false,
  },
}

export async function POST(req: Request) {
  try {
    // Get the raw request body
    const rawBody = await req.text()

    // Get the Stripe signature from the headers
    const signature = req.headers.get("stripe-signature")
    if (!signature) {
      return new NextResponse("Missing Stripe signature", { status: 400 })
    }

    // Verify the webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET || "")
    } catch (err) {
      console.error("Webhook signature verification failed:", err)
      return new NextResponse("Invalid signature", { status: 400 })
    }

    // Handle the event based on its type
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId = session.client_reference_id

        if (!orgId) {
          console.error("Missing orgId in session:", session)
          return new NextResponse("Missing orgId", { status: 400 })
        }

        // Get subscription details
        const subscriptionId = session.subscription as string
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)

        // Save subscription to Convex
        await convexClient.mutation(api.billing.saveSubscriptionId, {
          orgId,
          subscriptionId,
          planId: subscription.items.data[0].price.id,
          status: subscription.status,
          currentPeriodStart: subscription.current_period_start * 1000, // Convert to milliseconds
          currentPeriodEnd: subscription.current_period_end * 1000, // Convert to milliseconds
        })

        break
      }

      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice
        const customerId = invoice.customer as string

        // Find the organization by customer ID
        // In a real implementation, you'd query your database
        // For now, we'll use the customer metadata
        const customer = await stripe.customers.retrieve(customerId)
        const orgId = customer.metadata.orgId

        if (!orgId) {
          console.error("Missing orgId in customer metadata:", customer)
          return new NextResponse("Missing orgId", { status: 400 })
        }

        // Save invoice to Convex
        await convexClient.mutation(api.billing.handleInvoicePaid, {
          orgId,
          invoiceId: invoice.id,
          amount: invoice.amount_paid,
          invoiceUrl: invoice.hosted_invoice_url,
          invoicePdf: invoice.invoice_pdf,
        })

        break
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        // Find the organization by customer ID
        const customer = await stripe.customers.retrieve(customerId)
        const orgId = customer.metadata.orgId

        if (!orgId) {
          console.error("Missing orgId in customer metadata:", customer)
          return new NextResponse("Missing orgId", { status: 400 })
        }

        // Update subscription in Convex
        await convexClient.mutation(api.billing.saveSubscriptionId, {
          orgId,
          subscriptionId: subscription.id,
          planId: subscription.items.data[0].price.id,
          status: subscription.status,
          currentPeriodStart: subscription.current_period_start * 1000,
          currentPeriodEnd: subscription.current_period_end * 1000,
        })

        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return new NextResponse("Webhook processed successfully", { status: 200 })
  } catch (error) {
    console.error("Error processing webhook:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
