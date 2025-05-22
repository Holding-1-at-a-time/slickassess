import { OpenAI } from "openai"

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

interface DamageDetectionResult {
  damages: Array<{
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
 * Detects vehicle damage using OpenAI's vision model
 * This is a more realistic implementation that would be used in production
 */
export async function analyzeVehicleImage(imageUrl: string): Promise<DamageDetectionResult> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: `You are an expert vehicle damage assessor. Analyze the vehicle image and identify any damage.
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
          }`,
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
      max_tokens: 1000,
      response_format: { type: "json_object" },
    })

    const result = response.choices[0]?.message?.content
    if (!result) {
      throw new Error("No response from AI model")
    }

    // Parse the JSON response
    const parsedResult = JSON.parse(result) as DamageDetectionResult

    // Convert percentage coordinates to pixel coordinates
    // Assuming a standard image size of 800x600 for this example
    // In a real implementation, you would get the actual image dimensions
    const imageWidth = 800
    const imageHeight = 600

    parsedResult.damages = parsedResult.damages.map((damage) => ({
      ...damage,
      boundingBox: {
        x: Math.floor(damage.boundingBox.x * imageWidth),
        y: Math.floor(damage.boundingBox.y * imageHeight),
        width: Math.floor(damage.boundingBox.width * imageWidth),
        height: Math.floor(damage.boundingBox.height * imageHeight),
      },
    }))

    return parsedResult
  } catch (error) {
    console.error("Error analyzing vehicle image:", error)
    throw error
  }
}
