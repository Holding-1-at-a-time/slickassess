import { NextResponse } from "next/server"
import Stripe from "stripe"
import { requireEnv } from "@/utils/env"

// Initialize Stripe
const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
  apiVersion: "2023-10-16",
})

// Define our pricing plans with metadata
const PRICING_PLANS = [
  {
    id: "price_basic",
    name: "Basic",
    description: "Perfect for small teams getting started",
    price: 4900, // $49.00 in cents
    interval: "month",
    features: [
      "Up to 50 assessments per month",
      "Basic damage detection",
      "Email notifications",
      "30-day data retention",
      "Standard support",
    ],
    stripePriceId: process.env.STRIPE_BASIC_PRICE_ID,
  },
  {
    id: "price_pro",
    name: "Professional",
    description: "Best for growing businesses",
    price: 9900, // $99.00 in cents
    interval: "month",
    features: [
      "Up to 200 assessments per month",
      "Advanced damage detection",
      "Email & SMS notifications",
      "90-day data retention",
      "Priority support",
      "Custom branding",
    ],
    stripePriceId: process.env.STRIPE_PRO_PRICE_ID,
    popular: true,
  },
  {
    id: "price_enterprise",
    name: "Enterprise",
    description: "For large organizations with advanced needs",
    price: 19900, // $199.00 in cents
    interval: "month",
    features: [
      "Unlimited assessments",
      "Premium damage detection",
      "All notification channels",
      "1-year data retention",
      "24/7 priority support",
      "Custom integrations",
      "Dedicated account manager",
      "Advanced analytics",
    ],
    stripePriceId: process.env.STRIPE_ENTERPRISE_PRICE_ID,
  },
]

export async function GET() {
  try {
    // In a real implementation, you might want to fetch live pricing from Stripe
    // For now, we'll return our predefined plans

    // Optionally validate that the Stripe price IDs exist
    const validatedPlans = await Promise.all(
      PRICING_PLANS.map(async (plan) => {
        if (plan.stripePriceId) {
          try {
            const stripePrice = await stripe.prices.retrieve(plan.stripePriceId)
            return {
              ...plan,
              stripePrice: {
                id: stripePrice.id,
                unit_amount: stripePrice.unit_amount,
                currency: stripePrice.currency,
                recurring: stripePrice.recurring,
              },
            }
          } catch (error) {
            console.warn(`Failed to validate Stripe price ${plan.stripePriceId}:`, error)
            return plan
          }
        }
        return plan
      }),
    )

    return NextResponse.json({ plans: validatedPlans })
  } catch (error) {
    console.error("Error fetching pricing plans:", error)
    return new NextResponse("Internal Server Error", { status: 500 })
  }
}
