import { logger } from "@/lib/logging/logger"

// Define the environment variables we expect
interface EnvVariables {
  // Next.js
  NODE_ENV: string

  // App
  NEXT_PUBLIC_APP_URL: string

  // Clerk
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: string
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: string
  NEXT_PUBLIC_CLERK_FRONTEND_API_URL: string
  CLERK_JWT_ISSUER_DOMAIN: string
  CLERK_WEBHOOK_SECRET: string

  // Convex
  NEXT_PUBLIC_CONVEX_URL: string
  CONVEX_ADMIN_KEY: string

  // OpenAI
  OPENAI_API_KEY: string

  // Google
  GOOGLE_CLIENT_ID: string
  GOOGLE_CLIENT_SECRET: string
  GOOGLE_API_KEY: string
  GCP_CREDENTIALS_JSON: string
  GCP_PROJECT_ID: string

  // Stripe
  STRIPE_SECRET_KEY: string
  STRIPE_WEBHOOK_SECRET: string
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: string
  STRIPE_BASIC_PRICE_ID: string
  STRIPE_PRO_PRICE_ID: string
  STRIPE_ENTERPRISE_PRICE_ID: string

  // Security
  CSRF_SECRET: string
  CRON_SECRET: string

  // Logging
  LOG_LEVEL: string
  ANALYTICS_ENABLED: string
  DATADOG_API_KEY: string
  APP_VERSION: string
}

// Cache the validated environment variables
let cachedEnv: Partial<EnvVariables> | null = null

// Get all environment variables with validation
export function getEnv(): Partial<EnvVariables> {
  if (cachedEnv) return cachedEnv

  const env: Partial<EnvVariables> = {}

  // Add all environment variables to the env object
  Object.keys(process.env).forEach((key) => {
    const typedKey = key as keyof EnvVariables
    if (process.env[key]) {
      env[typedKey] = process.env[key] as string
    }
  })

  // Cache the result
  cachedEnv = env

  return env
}

// Get a specific environment variable with validation
export function getEnvVariable<K extends keyof EnvVariables>(key: K, required = true): EnvVariables[K] | undefined {
  const value = process.env[key]

  if (required && !value) {
    const error = new Error(`Missing required environment variable: ${key}`)
    logger.error({ error, key }, "Missing required environment variable")
    throw error
  }

  return value as EnvVariables[K]
}

// Require an environment variable (throws if not found)
export function requireEnv<K extends keyof EnvVariables>(key: K): EnvVariables[K] {
  const value = getEnvVariable(key, true)
  return value as EnvVariables[K]
}

// Get a public environment variable (safe for client-side)
export function getPublicEnv<K extends keyof EnvVariables>(key: K): EnvVariables[K] | undefined {
  if (!key.startsWith("NEXT_PUBLIC_")) {
    const error = new Error(`Attempted to access non-public env var on client: ${key}`)
    logger.error({ error, key }, "Attempted to access non-public env var on client")
    throw error
  }

  return getEnvVariable(key, false)
}

// Validate that all required environment variables are present
export function validateEnv(requiredVars: Array<keyof EnvVariables>): boolean {
  const missingVars: Array<keyof EnvVariables> = []

  for (const key of requiredVars) {
    if (!process.env[key]) {
      missingVars.push(key)
    }
  }

  if (missingVars.length > 0) {
    logger.error({ missingVars }, "Missing required environment variables")
    return false
  }

  return true
}
