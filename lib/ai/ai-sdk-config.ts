import { OpenAI } from "@ai-sdk/openai"
import { GoogleGenerativeAI } from "@ai-sdk/google"
import { env } from "@/lib/env"

// Initialize OpenAI client for text and vision tasks
export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
})

// Initialize Google Gemini for multimodal tasks
export const gemini = new GoogleGenerativeAI({
  apiKey: env.GOOGLE_API_KEY,
})

// Model configurations
export const MODELS = {
  // Text generation models
  textGeneration: openai("gpt-4o"),

  // Vision models
  visionAnalysis: openai("gpt-4-vision-preview"),
  geminiVision: gemini("gemini-pro-vision"),

  // Embedding models
  embedding: openai("text-embedding-3-small"),
}

// Prompt templates
export const PROMPTS = {
  exteriorDamageAnalysis: `
    You are an expert vehicle damage assessor with years of experience in the automotive industry.
    Analyze this vehicle image and identify any exterior damage with precision.
    
    For each damage found, provide:
    1. Type (scratch, dent, crack, rust, broken, missing, etc.)
    2. Severity (minor, moderate, severe)
    3. Location on the vehicle (front bumper, rear quarter panel, driver door, etc.)
    4. Approximate size (small, medium, large)
    5. Estimated repair complexity (simple, moderate, complex)
    6. Bounding box coordinates as percentages of image dimensions (x, y, width, height)
    
    Also provide:
    - An overall vehicle condition rating (excellent, good, fair, poor)
    - A summary of all damage found
    - Repair recommendations
    
    Format your response as JSON with this structure:
    {
      "damages": [
        {
          "type": string,
          "severity": string,
          "location": string,
          "size": string,
          "repairComplexity": string,
          "boundingBox": {
            "x": number,
            "y": number,
            "width": number,
            "height": number
          }
        }
      ],
      "overallCondition": string,
      "summary": string,
      "recommendations": string[]
    }
  `,

  interiorCleanlinessAnalysis: `
    You are an expert vehicle interior assessor with years of experience in automotive detailing.
    Analyze this vehicle interior image and assess its cleanliness and condition.
    
    For each issue found, provide:
    1. Type (stain, tear, wear, debris, dirt, odor indicators, etc.)
    2. Severity (minor, moderate, severe)
    3. Location (driver seat, passenger seat, dashboard, floor, etc.)
    4. Cleaning/repair recommendation
    5. Bounding box coordinates as percentages of image dimensions (x, y, width, height)
    
    Also provide:
    - An overall interior cleanliness rating (immaculate, clean, average, dirty, extremely dirty)
    - A summary of all issues found
    - Cleaning/restoration recommendations
    
    Format your response as JSON with this structure:
    {
      "issues": [
        {
          "type": string,
          "severity": string,
          "location": string,
          "recommendation": string,
          "boundingBox": {
            "x": number,
            "y": number,
            "width": number,
            "height": number
          }
        }
      ],
      "overallCleanliness": string,
      "summary": string,
      "recommendations": string[]
    }
  `,
}
