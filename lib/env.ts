// Environment variable helper functions

/**
 * Get an environment variable, throwing an error if it's not defined
 */
export function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value) {
    // In development, provide a more helpful error message
    if (process.env.NODE_ENV === "development") {
      throw new Error(
        `Missing required environment variable: ${name}\n` +
          `Please add it to your .env.local file or environment variables.`,
      )
    }
    // In production, log the error but don't expose the variable name
    console.error(`Missing required environment variable. Please check server configuration.`)
    throw new Error(`Internal server configuration error`)
  }
  return value
}

/**
 * Environment variables with type safety
 */
export const env = {
  // API Keys
  OPENAI_API_KEY:
    process.env.NODE_ENV === "production" ? requireEnv("OPENAI_API_KEY") : process.env.OPENAI_API_KEY || "",
  GOOGLE_API_KEY:
    process.env.NODE_ENV === "production" ? requireEnv("GOOGLE_API_KEY") : process.env.GOOGLE_API_KEY || "",

  // Stripe
  STRIPE_SECRET_KEY:
    process.env.NODE_ENV === "production" ? requireEnv("STRIPE_SECRET_KEY") : process.env.STRIPE_SECRET_KEY || "",
  STRIPE_WEBHOOK_SECRET:
    process.env.NODE_ENV === "production"
      ? requireEnv("STRIPE_WEBHOOK_SECRET")
      : process.env.STRIPE_WEBHOOK_SECRET || "",
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || "",

  // Stripe Price IDs
  STRIPE_BASIC_PRICE_ID:
    process.env.NODE_ENV === "production"
      ? requireEnv("STRIPE_BASIC_PRICE_ID")
      : process.env.STRIPE_BASIC_PRICE_ID || "",
  STRIPE_PRO_PRICE_ID:
    process.env.NODE_ENV === "production" ? requireEnv("STRIPE_PRO_PRICE_ID") : process.env.STRIPE_PRO_PRICE_ID || "",
  STRIPE_ENTERPRISE_PRICE_ID:
    process.env.NODE_ENV === "production"
      ? requireEnv("STRIPE_ENTERPRISE_PRICE_ID")
      : process.env.STRIPE_ENTERPRISE_PRICE_ID || "",

  // App URLs
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || "",
  NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL || "",

  // Convex
  CONVEX_ADMIN_KEY:
    process.env.NODE_ENV === "production" ? requireEnv("CONVEX_ADMIN_KEY") : process.env.CONVEX_ADMIN_KEY || "",

  // Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || "",
  CLERK_SECRET_KEY:
    process.env.NODE_ENV === "production" ? requireEnv("CLERK_SECRET_KEY") : process.env.CLERK_SECRET_KEY || "",
  CLERK_WEBHOOK_SECRET:
    process.env.NODE_ENV === "production" ? requireEnv("CLERK_WEBHOOK_SECRET") : process.env.CLERK_WEBHOOK_SECRET || "",
}

/**
 * Validate that all required environment variables are present
 * Call this at startup to fail fast if configuration is missing
 */
export function validateEnv() {
  if (process.env.NODE_ENV === "production") {
    const requiredVars = [
      "OPENAI_API_KEY",
      "GOOGLE_API_KEY",
      "STRIPE_SECRET_KEY",
      "STRIPE_WEBHOOK_SECRET",
      "STRIPE_BASIC_PRICE_ID",
      "STRIPE_PRO_PRICE_ID",
      "STRIPE_ENTERPRISE_PRICE_ID",
      "CONVEX_ADMIN_KEY",
      "CLERK_SECRET_KEY",
      "CLERK_WEBHOOK_SECRET",
    ]

    for (const varName of requiredVars) {
      requireEnv(varName)
    }
  }
}
