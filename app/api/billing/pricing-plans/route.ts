import { NextResponse } from "next/server"
import { requireEnv } from "@/utils/env"

const PRICING_PLANS = [
  {
    name: "Basic",
    description: "Essential features to get started.",
    price: "$19",
    stripePriceId: requireEnv("STRIPE_BASIC_PRICE_ID"),
    features: ["Feature 1", "Feature 2", "Feature 3"],
  },
  {
    name: "Pro",
    description: "Advanced tools for growing teams.",
    price: "$49",
    stripePriceId: requireEnv("STRIPE_PRO_PRICE_ID"),
    features: ["All Basic features", "Feature 4", "Feature 5"],
  },
  {
    name: "Enterprise",
    description: "Custom solutions for large organizations.",
    price: "Contact Us",
    stripePriceId: requireEnv("STRIPE_ENTERPRISE_PRICE_ID"),
    features: ["All Pro features", "Dedicated support", "Custom integrations"],
  },
]

export async function GET() {
  return NextResponse.json(PRICING_PLANS)
}
