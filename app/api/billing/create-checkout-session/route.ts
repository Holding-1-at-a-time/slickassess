import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
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

export async function POST(req: Request) {
  try {
    // Authenticate the request
    const { userId, orgId } = auth()
    if (!userId) return new NextResponse("Unauthorized", { status: 401 })
    if (!orgId) return new NextResponse("No organization selected", { status: 400 })

    // Parse the request body
    const { priceId } = await req.json()
    if (!priceId) return new NextResponse("Missing priceId", { status: 400 })

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
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
      client_reference_id: orgId,
      metadata: {
        orgId,
      },
    })

    // Return the session ID to the client
    return NextResponse.json({ sessionId: session.id })
  } catch (error) {
    console.error("Error creating checkout session:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
