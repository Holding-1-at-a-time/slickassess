import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import Stripe from "stripe"
import { ConvexHttpClient } from "convex/http"
import { api } from "@/convex/_generated/api"
import { requireEnv } from "@/lib/env"
import { validateRequestAsync } from "@/lib/validation/api-validator"
import { createCheckoutSessionSchema } from "@/lib/validation/schemas"
import { validateCsrfToken } from "@/lib/security/csrf"
import { logger } from "@/lib/logging/logger"

// Initialize Stripe
const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2023-10-16",
})

// Initialize Convex client
const convexUrl = requireEnv("NEXT_PUBLIC_CONVEX_URL")
const convexAdminKey = requireEnv("CONVEX_ADMIN_KEY")
const convexClient = new ConvexHttpClient(convexUrl, convexAdminKey)

export async function POST(req: Request) {
  try {
    // Authenticate the request
    const { userId, orgId } = auth()
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })
    if (!orgId) return new NextResponse("No organization selected", { status: 400 })

    // Validate CSRF token
    const csrfValidation = await validateCsrfToken(req as any)
    if (!csrfValidation.valid) {
      logger.warn({ reason: csrfValidation.reason }, "CSRF validation failed")
      return NextResponse.json({ error: "Invalid CSRF token" }, { status: 403 })
    }

    // Validate request body
    const validation = await validateRequestAsync(req as any, {
      schema: createCheckoutSessionSchema,
      source: "body",
    })

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation Error",
          details: validation.error.errors.map((err) => ({
            path: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 },
      )
    }

    const { priceId } = validation.data

    // Get or create a Stripe customer for this organization
    const stripeCustomerId = await convexClient.mutation(api.billing.getOrCreateCustomerId, {
      orgId,
    })

    // Create a Stripe checkout session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      customer: stripeCustomerId,
      success_url: `${requireEnv("NEXT_PUBLIC_APP_URL")}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${requireEnv("NEXT_PUBLIC_APP_URL")}/settings/billing`,
      client_reference_id: orgId,
      metadata: {
        orgId,
      },
    })

    logger.info({ userId, orgId, priceId }, "Created Stripe checkout session")

    // Return the session ID to the client
    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    logger.error({ error }, "Error creating checkout session")
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
