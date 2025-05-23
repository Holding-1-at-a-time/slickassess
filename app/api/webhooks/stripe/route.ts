import { NextResponse } from "next/server"
import Stripe from "stripe"
import { ConvexHttpClient } from "convex/http"
import { api } from "@/convex/_generated/api"
import { requireEnv } from "@/utils/env"
import { logger } from "@/lib/logger"

// Initialize Stripe
const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2023-10-16",
})

// Initialize Convex client
const convexUrl = requireEnv("NEXT_PUBLIC_CONVEX_URL")
const convexAdminKey = requireEnv("CONVEX_ADMIN_KEY")
const convexClient = new ConvexHttpClient(convexUrl, convexAdminKey)

// Set of processed event IDs for idempotency
const processedEvents = new Set<string>()

// Cleanup old events periodically (every hour)
setInterval(
  () => {
    processedEvents.clear()
  },
  60 * 60 * 1000,
)

export async function POST(req: Request) {
  try {
    // Get the raw request body
    const rawBody = await req.text()

    // Get the Stripe signature from the headers
    const signature = req.headers.get("stripe-signature")
    if (!signature) {
      logger.warn("Missing Stripe signature")
      return new NextResponse("Missing Stripe signature", { status: 400 })
    }

    // Verify the webhook signature
    let event: Stripe.Event
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, requireEnv("STRIPE_WEBHOOK_SECRET"))
    } catch (err) {
      logger.error("Webhook signature verification failed:", err)
      return new NextResponse("Invalid signature", { status: 400 })
    }

    // Check for idempotency
    if (processedEvents.has(event.id)) {
      logger.info(`Event ${event.id} already processed, skipping`)
      return new NextResponse("Event already processed", { status: 200 })
    }

    // Add event to processed set
    processedEvents.add(event.id)

    // Log the event
    logger.info(`Processing Stripe event: ${event.type} (${event.id})`)

    // Handle the event based on its type
    try {
      switch (event.type) {
        case "checkout.session.completed": {
          await handleCheckoutSessionCompleted(event)
          break
        }

        case "checkout.session.expired": {
          await handleCheckoutSessionExpired(event)
          break
        }

        case "invoice.paid": {
          await handleInvoicePaid(event)
          break
        }

        case "invoice.payment_failed": {
          await handleInvoicePaymentFailed(event)
          break
        }

        case "invoice.payment_action_required": {
          await handleInvoicePaymentActionRequired(event)
          break
        }

        case "customer.subscription.created": {
          await handleSubscriptionCreated(event)
          break
        }

        case "customer.subscription.updated": {
          await handleSubscriptionUpdated(event)
          break
        }

        case "customer.subscription.deleted": {
          await handleSubscriptionDeleted(event)
          break
        }

        case "customer.subscription.trial_will_end": {
          await handleSubscriptionTrialWillEnd(event)
          break
        }

        case "customer.subscription.pending_update_applied": {
          await handleSubscriptionPendingUpdateApplied(event)
          break
        }

        case "customer.subscription.pending_update_expired": {
          await handleSubscriptionPendingUpdateExpired(event)
          break
        }

        case "customer.created": {
          await handleCustomerCreated(event)
          break
        }

        case "customer.updated": {
          await handleCustomerUpdated(event)
          break
        }

        case "customer.deleted": {
          await handleCustomerDeleted(event)
          break
        }

        case "payment_method.attached": {
          await handlePaymentMethodAttached(event)
          break
        }

        case "payment_method.detached": {
          await handlePaymentMethodDetached(event)
          break
        }

        case "payment_method.updated": {
          await handlePaymentMethodUpdated(event)
          break
        }

        default:
          logger.info(`Unhandled event type: ${event.type}`)
      }
    } catch (error) {
      logger.error(`Error processing event ${event.type}:`, error)
      // Don't return an error response, as Stripe will retry the webhook
      // Instead, log the error and return a 200 response
      return new NextResponse(
        JSON.stringify({
          status: "error",
          message: "Error processing webhook, will retry later",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      )
    }

    return new NextResponse(JSON.stringify({ status: "success" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    logger.error("Error processing webhook:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}

// Handler functions for each event type

async function handleCheckoutSessionCompleted(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session
  const orgId = session.client_reference_id

  if (!orgId) {
    logger.error("Missing orgId in session:", session)
    throw new Error("Missing orgId")
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

  // Create notification for organization
  await convexClient.mutation(api.notifications.createNotification, {
    orgId,
    title: "Subscription Activated",
    message: `Your subscription has been activated successfully.`,
    type: "billing",
    link: "/settings/billing",
  })

  logger.info(`Subscription ${subscriptionId} activated for org ${orgId}`)
}

async function handleCheckoutSessionExpired(event: Stripe.Event) {
  const session = event.data.object as Stripe.Checkout.Session
  const orgId = session.client_reference_id

  if (!orgId) {
    logger.error("Missing orgId in session:", session)
    throw new Error("Missing orgId")
  }

  // Log the expired checkout session
  await convexClient.mutation(api.billing.logCheckoutSessionExpired, {
    orgId,
    sessionId: session.id,
  })

  logger.info(`Checkout session ${session.id} expired for org ${orgId}`)
}

async function handleInvoicePaid(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice
  const customerId = invoice.customer as string

  // Find the organization by customer ID
  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted) {
    logger.error("Customer was deleted:", customerId)
    throw new Error("Customer deleted")
  }

  const orgId = customer.metadata.orgId

  if (!orgId) {
    logger.error("Missing orgId in customer metadata:", customer)
    throw new Error("Missing orgId")
  }

  // Save invoice to Convex
  await convexClient.mutation(api.billing.handleInvoicePaid, {
    orgId,
    invoiceId: invoice.id,
    amount: invoice.amount_paid,
    invoiceUrl: invoice.hosted_invoice_url,
    invoicePdf: invoice.invoice_pdf,
    periodStart: invoice.period_start * 1000,
    periodEnd: invoice.period_end * 1000,
    status: invoice.status,
    billingReason: invoice.billing_reason,
  })

  // Create notification for organization
  await convexClient.mutation(api.notifications.createNotification, {
    orgId,
    title: "Payment Successful",
    message: `Your payment of ${formatAmount(invoice.amount_paid, invoice.currency)} has been processed successfully.`,
    type: "billing",
    link: "/settings/billing",
  })

  logger.info(`Invoice ${invoice.id} paid for org ${orgId}`)
}

async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice
  const customerId = invoice.customer as string

  // Find the organization by customer ID
  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted) {
    logger.error("Customer was deleted:", customerId)
    throw new Error("Customer deleted")
  }

  const orgId = customer.metadata.orgId

  if (!orgId) {
    logger.error("Missing orgId in customer metadata:", customer)
    throw new Error("Missing orgId")
  }

  // Handle failed payment
  await convexClient.mutation(api.billing.handleInvoicePaymentFailed, {
    orgId,
    invoiceId: invoice.id,
    amount: invoice.amount_due,
    nextPaymentAttempt: invoice.next_payment_attempt ? invoice.next_payment_attempt * 1000 : null,
    attemptCount: invoice.attempt_count,
  })

  // Create notification for organization
  await convexClient.mutation(api.notifications.createNotification, {
    orgId,
    title: "Payment Failed",
    message: `Your payment of ${formatAmount(invoice.amount_due, invoice.currency)} failed. Please update your payment method.`,
    type: "billing",
    link: "/settings/billing",
    priority: "high",
  })

  logger.info(`Invoice ${invoice.id} payment failed for org ${orgId}`)
}

async function handleInvoicePaymentActionRequired(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice
  const customerId = invoice.customer as string

  // Find the organization by customer ID
  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted) {
    logger.error("Customer was deleted:", customerId)
    throw new Error("Customer deleted")
  }

  const orgId = customer.metadata.orgId

  if (!orgId) {
    logger.error("Missing orgId in customer metadata:", customer)
    throw new Error("Missing orgId")
  }

  // Get the payment intent that requires action
  const paymentIntentId = invoice.payment_intent as string
  const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)

  // Create notification for organization
  await convexClient.mutation(api.notifications.createNotification, {
    orgId,
    title: "Payment Action Required",
    message: `Your payment requires additional action. Please complete the payment process.`,
    type: "billing",
    link: "/settings/billing",
    priority: "high",
    data: {
      paymentIntentId,
      clientSecret: paymentIntent.client_secret,
    },
  })

  logger.info(`Invoice ${invoice.id} requires payment action for org ${orgId}`)
}

async function handleSubscriptionCreated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription
  const customerId = subscription.customer as string

  // Find the organization by customer ID
  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted) {
    logger.error("Customer was deleted:", customerId)
    throw new Error("Customer deleted")
  }

  const orgId = customer.metadata.orgId

  if (!orgId) {
    logger.error("Missing orgId in customer metadata:", customer)
    throw new Error("Missing orgId")
  }

  // Save subscription to Convex
  await convexClient.mutation(api.billing.saveSubscriptionId, {
    orgId,
    subscriptionId: subscription.id,
    planId: subscription.items.data[0].price.id,
    status: subscription.status,
    currentPeriodStart: subscription.current_period_start * 1000,
    currentPeriodEnd: subscription.current_period_end * 1000,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialEnd: subscription.trial_end ? subscription.trial_end * 1000 : null,
  })

  logger.info(`Subscription ${subscription.id} created for org ${orgId}`)
}

async function handleSubscriptionUpdated(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription
  const customerId = subscription.customer as string

  // Find the organization by customer ID
  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted) {
    logger.error("Customer was deleted:", customerId)
    throw new Error("Customer deleted")
  }

  const orgId = customer.metadata.orgId

  if (!orgId) {
    logger.error("Missing orgId in customer metadata:", customer)
    throw new Error("Missing orgId")
  }

  // Update subscription in Convex
  await convexClient.mutation(api.billing.saveSubscriptionId, {
    orgId,
    subscriptionId: subscription.id,
    planId: subscription.items.data[0].price.id,
    status: subscription.status,
    currentPeriodStart: subscription.current_period_start * 1000,
    currentPeriodEnd: subscription.current_period_end * 1000,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
    trialEnd: subscription.trial_end ? subscription.trial_end * 1000 : null,
  })

  logger.info(`Subscription ${subscription.id} updated for org ${orgId}`)
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription
  const customerId = subscription.customer as string

  // Find the organization by customer ID
  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted) {
    logger.error("Customer was deleted:", customerId)
    throw new Error("Customer deleted")
  }

  const orgId = customer.metadata.orgId

  if (!orgId) {
    logger.error("Missing orgId in customer metadata:", customer)
    throw new Error("Missing orgId")
  }

  // Mark subscription as canceled in Convex
  await convexClient.mutation(api.billing.saveSubscriptionId, {
    orgId,
    subscriptionId: subscription.id,
    planId: subscription.items.data[0].price.id,
    status: "canceled",
    currentPeriodStart: subscription.current_period_start * 1000,
    currentPeriodEnd: subscription.current_period_end * 1000,
    cancelAtPeriodEnd: false,
  })

  // Create notification for organization
  await convexClient.mutation(api.notifications.createNotification, {
    orgId,
    title: "Subscription Canceled",
    message: `Your subscription has been canceled. Your access will end on ${new Date(subscription.current_period_end * 1000).toLocaleDateString()}.`,
    type: "billing",
    link: "/settings/billing",
  })

  logger.info(`Subscription ${subscription.id} canceled for org ${orgId}`)
}

async function handleSubscriptionTrialWillEnd(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription
  const customerId = subscription.customer as string

  // Find the organization by customer ID
  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted) {
    logger.error("Customer was deleted:", customerId)
    throw new Error("Customer deleted")
  }

  const orgId = customer.metadata.orgId

  if (!orgId) {
    logger.error("Missing orgId in customer metadata:", customer)
    throw new Error("Missing orgId")
  }

  // Create notification for organization
  await convexClient.mutation(api.notifications.createNotification, {
    orgId,
    title: "Trial Ending Soon",
    message: `Your trial period will end on ${new Date(subscription.trial_end! * 1000).toLocaleDateString()}. Please update your payment method to continue your subscription.`,
    type: "billing",
    link: "/settings/billing",
    priority: "medium",
  })

  logger.info(`Trial ending soon for subscription ${subscription.id} (org ${orgId})`)
}

async function handleSubscriptionPendingUpdateApplied(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription
  const customerId = subscription.customer as string

  // Find the organization by customer ID
  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted) {
    logger.error("Customer was deleted:", customerId)
    throw new Error("Customer deleted")
  }

  const orgId = customer.metadata.orgId

  if (!orgId) {
    logger.error("Missing orgId in customer metadata:", customer)
    throw new Error("Missing orgId")
  }

  // Update subscription in Convex
  await convexClient.mutation(api.billing.saveSubscriptionId, {
    orgId,
    subscriptionId: subscription.id,
    planId: subscription.items.data[0].price.id,
    status: subscription.status,
    currentPeriodStart: subscription.current_period_start * 1000,
    currentPeriodEnd: subscription.current_period_end * 1000,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  })

  logger.info(`Pending update applied for subscription ${subscription.id} (org ${orgId})`)
}

async function handleSubscriptionPendingUpdateExpired(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription
  const customerId = subscription.customer as string

  // Find the organization by customer ID
  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted) {
    logger.error("Customer was deleted:", customerId)
    throw new Error("Customer deleted")
  }

  const orgId = customer.metadata.orgId

  if (!orgId) {
    logger.error("Missing orgId in customer metadata:", customer)
    throw new Error("Missing orgId")
  }

  // Log the expired update
  await convexClient.mutation(api.billing.logSubscriptionUpdateExpired, {
    orgId,
    subscriptionId: subscription.id,
  })

  logger.info(`Pending update expired for subscription ${subscription.id} (org ${orgId})`)
}

async function handleCustomerCreated(event: Stripe.Event) {
  const customer = event.data.object as Stripe.Customer
  const orgId = customer.metadata.orgId

  if (!orgId) {
    logger.warn("Customer created without orgId in metadata:", customer.id)
    return
  }

  // Save customer to Convex
  await convexClient.mutation(api.billing.saveCustomerId, {
    orgId,
    customerId: customer.id,
    email: customer.email || "",
    name: customer.name || "",
  })

  logger.info(`Customer ${customer.id} created for org ${orgId}`)
}

async function handleCustomerUpdated(event: Stripe.Event) {
  const customer = event.data.object as Stripe.Customer
  const orgId = customer.metadata.orgId

  if (!orgId) {
    logger.warn("Customer updated without orgId in metadata:", customer.id)
    return
  }

  // Update customer in Convex
  await convexClient.mutation(api.billing.updateCustomer, {
    orgId,
    customerId: customer.id,
    email: customer.email || "",
    name: customer.name || "",
    defaultPaymentMethod: (customer.invoice_settings.default_payment_method as string) || null,
  })

  logger.info(`Customer ${customer.id} updated for org ${orgId}`)
}

async function handleCustomerDeleted(event: Stripe.Event) {
  const customer = event.data.object as Stripe.Customer
  const orgId = customer.metadata.orgId

  if (!orgId) {
    logger.warn("Customer deleted without orgId in metadata:", customer.id)
    return
  }

  // Mark customer as deleted in Convex
  await convexClient.mutation(api.billing.deleteCustomer, {
    orgId,
    customerId: customer.id,
  })

  logger.info(`Customer ${customer.id} deleted for org ${orgId}`)
}

async function handlePaymentMethodAttached(event: Stripe.Event) {
  const paymentMethod = event.data.object as Stripe.PaymentMethod
  const customerId = paymentMethod.customer as string

  // Find the organization by customer ID
  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted) {
    logger.error("Customer was deleted:", customerId)
    throw new Error("Customer deleted")
  }

  const orgId = customer.metadata.orgId

  if (!orgId) {
    logger.error("Missing orgId in customer metadata:", customer)
    throw new Error("Missing orgId")
  }

  // Save payment method to Convex
  await convexClient.mutation(api.billing.savePaymentMethod, {
    orgId,
    customerId,
    paymentMethodId: paymentMethod.id,
    type: paymentMethod.type,
    last4: getPaymentMethodLast4(paymentMethod),
    expiryMonth: getPaymentMethodExpiryMonth(paymentMethod),
    expiryYear: getPaymentMethodExpiryYear(paymentMethod),
    brand: getPaymentMethodBrand(paymentMethod),
  })

  logger.info(`Payment method ${paymentMethod.id} attached for org ${orgId}`)
}

async function handlePaymentMethodDetached(event: Stripe.Event) {
  const paymentMethod = event.data.object as Stripe.PaymentMethod
  const customerId = paymentMethod.customer as string

  if (!customerId) {
    logger.warn("Payment method detached without customer:", paymentMethod.id)
    return
  }

  // Find the organization by customer ID
  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted) {
    logger.error("Customer was deleted:", customerId)
    throw new Error("Customer deleted")
  }

  const orgId = customer.metadata.orgId

  if (!orgId) {
    logger.error("Missing orgId in customer metadata:", customer)
    throw new Error("Missing orgId")
  }

  // Remove payment method from Convex
  await convexClient.mutation(api.billing.removePaymentMethod, {
    orgId,
    paymentMethodId: paymentMethod.id,
  })

  logger.info(`Payment method ${paymentMethod.id} detached for org ${orgId}`)
}

async function handlePaymentMethodUpdated(event: Stripe.Event) {
  const paymentMethod = event.data.object as Stripe.PaymentMethod
  const customerId = paymentMethod.customer as string

  if (!customerId) {
    logger.warn("Payment method updated without customer:", paymentMethod.id)
    return
  }

  // Find the organization by customer ID
  const customer = await stripe.customers.retrieve(customerId)
  if (customer.deleted) {
    logger.error("Customer was deleted:", customerId)
    throw new Error("Customer deleted")
  }

  const orgId = customer.metadata.orgId

  if (!orgId) {
    logger.error("Missing orgId in customer metadata:", customer)
    throw new Error("Missing orgId")
  }

  // Update payment method in Convex
  await convexClient.mutation(api.billing.updatePaymentMethod, {
    orgId,
    paymentMethodId: paymentMethod.id,
    last4: getPaymentMethodLast4(paymentMethod),
    expiryMonth: getPaymentMethodExpiryMonth(paymentMethod),
    expiryYear: getPaymentMethodExpiryYear(paymentMethod),
    brand: getPaymentMethodBrand(paymentMethod),
  })

  logger.info(`Payment method ${paymentMethod.id} updated for org ${orgId}`)
}

// Helper functions

function formatAmount(amount: number, currency: string): string {
  const formatter = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  })

  return formatter.format(amount / 100)
}

function getPaymentMethodLast4(paymentMethod: Stripe.PaymentMethod): string {
  if (paymentMethod.type === "card" && paymentMethod.card) {
    return paymentMethod.card.last4
  }
  return ""
}

function getPaymentMethodExpiryMonth(paymentMethod: Stripe.PaymentMethod): number | null {
  if (paymentMethod.type === "card" && paymentMethod.card) {
    return paymentMethod.card.exp_month
  }
  return null
}

function getPaymentMethodExpiryYear(paymentMethod: Stripe.PaymentMethod): number | null {
  if (paymentMethod.type === "card" && paymentMethod.card) {
    return paymentMethod.card.exp_year
  }
  return null
}

function getPaymentMethodBrand(paymentMethod: Stripe.PaymentMethod): string {
  if (paymentMethod.type === "card" && paymentMethod.card) {
    return paymentMethod.card.brand
  }
  return paymentMethod.type
}
