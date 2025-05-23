import { requireEnv } from "@/lib/env"
import { logger } from "@/lib/logging/logger"

// Validate required environment variables at startup
try {
  requireEnv("OPENAI_API_KEY")
} catch (error) {
  logger.error({ error }, "Missing required AI environment variables")
}

// AI Models configuration
export const MODELS = {
  visionAnalysis: "gpt-4-vision-preview",
  textAnalysis: "gpt-4-turbo",
  embedding: "text-embedding-ada-002",
  prediction: "gpt-4",
}

// System prompts
export const PROMPTS = {
  exteriorDamageAnalysis: `
    You are an expert vehicle damage assessor. Analyze the vehicle exterior image and identify all damage.
    For each damage detected, provide:
    1. Type of damage (scratch, dent, crack, rust, broken part, etc.)
    2. Severity (minor, moderate, severe)
    3. Location on the vehicle
    4. Approximate bounding box coordinates (x, y, width, height as percentages of image dimensions)
    5. Repair complexity (simple, moderate, complex)
    
    Return the results as a structured JSON object with a 'damages' array containing each damage item.
  `,

  interiorCleanlinessAnalysis: `
    You are an expert vehicle interior assessor. Analyze the vehicle interior image and identify all cleanliness or damage issues.
    For each issue detected, provide:
    1. Type of issue (stain, tear, wear, debris, odor indicators, etc.)
    2. Severity (minor, moderate, severe)
    3. Location in the interior
    4. Approximate bounding box coordinates (x, y, width, height as percentages of image dimensions)
    5. Cleaning or repair recommendation
    
    Return the results as a structured JSON object with an 'issues' array containing each issue item.
  `,
}

// Helper function to get OpenAI API key securely
export function getOpenAIApiKey(): string {
  return requireEnv("OPENAI_API_KEY")
}
