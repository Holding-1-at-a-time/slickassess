import { OpenAI } from "openai"
import { createClient } from "@google-cloud/vision"
import { v4 as uuidv4 } from "uuid"

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

// Initialize Google Cloud Vision client
let visionClient: any = null

// Only initialize if GCP credentials are available
if (process.env.GCP_CREDENTIALS_JSON && process.env.GCP_PROJECT_ID) {
  try {
    const credentials = JSON.parse(process.env.GCP_CREDENTIALS_JSON)
    visionClient = createClient({
      credentials,
      projectId: process.env.GCP_PROJECT_ID,
    })
  } catch (error) {
    console.error("Failed to initialize Google Cloud Vision client:", error)
  }
}

interface DamageDetectionResult {
  damages: Array<{
    id: string
    type: string
    confidence: number
    boundingBox: {
      x: number
      y: number
      width: number
      height: number
    }
    description: string
  }>
  summary: string
}

/**
 * Detects vehicle damage using a combination of Google Cloud Vision and OpenAI
 */
export async function analyzeVehicleImage(imageUrl: string): Promise<DamageDetectionResult> {
  try {
    // Step 1: Use Google Cloud Vision to detect objects and damage areas
    let objectDetectionResults: any[] = []

    if (visionClient) {
      try {
        // Perform object detection with Google Cloud Vision
        const [result] = await visionClient.objectLocalization(imageUrl)
        const objects = result.localizedObjectAnnotations

        // Filter for vehicle-related objects
        objectDetectionResults = objects.filter((obj: any) => {
          const name = obj.name.toLowerCase()
          return (
            name.includes("car") ||
            name.includes("vehicle") ||
            name.includes("automobile") ||
            name.includes("truck") ||
            name.includes("van") ||
            name.includes("suv") ||
            name.includes("wheel") ||
            name.includes("door") ||
            name.includes("window") ||
            name.includes("bumper") ||
            name.includes("hood")
          )
        })
      } catch (error) {
        console.error("Google Cloud Vision error:", error)
        // Continue with OpenAI only if Google Vision fails
      }
    }

    // Step 2: Use OpenAI's vision model for detailed damage analysis
    const systemPrompt = `You are an expert vehicle damage assessor. Analyze the vehicle image and identify any damage.
    ${
      objectDetectionResults.length > 0
        ? `The following vehicle parts have been detected: ${objectDetectionResults.map((obj) => obj.name).join(", ")}.`
        : ""
    }
    
    For each damage found, provide:
    1. Type (scratch, dent, crack, rust, broken, missing)
    2. Confidence level (0.0-1.0)
    3. Bounding box coordinates (x, y, width, height) as percentages of image dimensions
    4. Brief description of the damage
    
    Also provide a summary of all damage found.
    
    Return your analysis in JSON format with this structure:
    {
      "damages": [
        {
          "id": "string",
          "type": "string",
          "confidence": number,
          "boundingBox": {
            "x": number,
            "y": number,
            "width": number,
            "height": number
          },
          "description": "string"
        }
      ],
      "summary": "string"
    }`

    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: imageUrl,
              },
            },
            {
              type: "text",
              text: "Analyze this vehicle image and identify any damage. Return the results in the specified JSON format.",
            },
          ],
        },
      ],
      max_tokens: 1500,
      response_format: { type: "json_object" },
    })

    const result = response.choices[0]?.message?.content
    if (!result) {
      throw new Error("No response from AI model")
    }

    // Parse the JSON response
    const parsedResult = JSON.parse(result)

    // Ensure each damage has an ID
    const damages = parsedResult.damages.map((damage: any) => ({
      ...damage,
      id: damage.id || uuidv4(),
    }))

    // Convert percentage coordinates to pixel coordinates
    // Assuming a standard image size of 800x600 for this example
    // In a real implementation, you would get the actual image dimensions
    const imageWidth = 800
    const imageHeight = 600

    const normalizedDamages = damages.map((damage: any) => ({
      ...damage,
      boundingBox: {
        x: Math.floor(damage.boundingBox.x * imageWidth),
        y: Math.floor(damage.boundingBox.y * imageHeight),
        width: Math.floor(damage.boundingBox.width * imageWidth),
        height: Math.floor(damage.boundingBox.height * imageHeight),
      },
    }))

    return {
      damages: normalizedDamages,
      summary: parsedResult.summary,
    }
  } catch (error) {
    console.error("Error analyzing vehicle image:", error)
    throw error
  }
}
