import { validateEnv } from "../lib/env"

// Validate environment variables
try {
  validateEnv()
  console.log("✅ All required environment variables are present")
  process.exit(0)
} catch (error) {
  console.error("❌ Environment validation failed:", error.message)
  process.exit(1)
}
