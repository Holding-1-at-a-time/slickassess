import { OpenAI } from "openai"
import type { Id } from "@/convex/_generated/dataModel"

// Initialize the OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

/**
 * Interface for AI feedback data
 */
export interface AIFeedbackData {
  imageId: Id<"vehicleImages">
  assessmentId?: Id<"assessments">
  originalPredictions: Array<{
    id: string
    type: string
    confidence: number
    boundingBox: {
      x: number
      y: number
      width: number
      height: number
    }
    category: string
    severity: string
  }>
  correctedAnnotations: Array<{
    id: string
    type: string
    x: number
    y: number
    width?: number
    height?: number
    radius?: number
    category: string
    severity: string
  }>
  feedbackType: "correction" | "confirmation" | "rejection"
  feedbackNotes?: string
  orgId: string
  clerkId: string
}

/**
 * Prepares training data from feedback for fine-tuning
 */
export async function prepareTrainingData(feedbackData: AIFeedbackData[], imageUrls: Record<string, string>) {
  // In a real implementation, this would prepare the data for fine-tuning
  // For this example, we'll just log the data
  console.log(`Preparing training data from ${feedbackData.length} feedback entries`)

  // Format the data for fine-tuning
  const trainingData = feedbackData
    .map((feedback) => {
      const imageUrl = imageUrls[feedback.imageId]

      // Skip if we don't have the image URL
      if (!imageUrl) {
        console.warn(`Missing image URL for feedback on image ${feedback.imageId}`)
        return null
      }

      // Create a training example
      return {
        messages: [
          {
            role: "system",
            content: "You are an expert vehicle damage assessor. Analyze the vehicle image and identify any damage.",
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
                text: "Analyze this vehicle image and identify any damage.",
              },
            ],
          },
          {
            role: "assistant",
            content: JSON.stringify({
              damages: feedback.correctedAnnotations.map((anno) => ({
                type: anno.category,
                confidence: 1.0, // High confidence for human-corrected annotations
                boundingBox: {
                  x: anno.x,
                  y: anno.y,
                  width: anno.width || 0,
                  height: anno.height || 0,
                },
                description: `${anno.category} with ${anno.severity} severity`,
              })),
              summary: `Vehicle has ${feedback.correctedAnnotations.length} damage areas including ${feedback.correctedAnnotations
                .map((a) => a.category)
                .join(", ")}`,
            }),
          },
        ],
      }
    })
    .filter(Boolean)

  return trainingData
}

/**
 * Creates a fine-tuning job with OpenAI
 */
export async function createFineTuningJob(trainingData: any[]) {
  // In a real implementation, this would create a fine-tuning job with OpenAI
  // For this example, we'll just log the data
  console.log(`Creating fine-tuning job with ${trainingData.length} examples`)

  // In a production environment, you would:
  // 1. Upload the training data to OpenAI
  // 2. Create a fine-tuning job
  // 3. Monitor the job status
  // 4. Deploy the fine-tuned model when ready

  // This is a simplified example of how you might create a fine-tuning job
  try {
    // Upload the training data
    const file = await openai.files.create({
      file: Buffer.from(JSON.stringify(trainingData)),
      purpose: "fine-tune",
    })

    // Create the fine-tuning job
    const fineTuningJob = await openai.fineTuning.jobs.create({
      training_file: file.id,
      model: "gpt-4-vision-preview", // The base model to fine-tune
      suffix: `vehicle-damage-detector-${Date.now()}`, // A unique identifier for this fine-tuned model
    })

    return fineTuningJob.id
  } catch (error) {
    console.error("Error creating fine-tuning job:", error)
    throw error
  }
}

/**
 * Checks the status of a fine-tuning job
 */
export async function checkFineTuningStatus(jobId: string) {
  try {
    const job = await openai.fineTuning.jobs.retrieve(jobId)
    return job
  } catch (error) {
    console.error("Error checking fine-tuning status:", error)
    throw error
  }
}

/**
 * Deploys a fine-tuned model
 */
export async function deployFineTunedModel(modelId: string) {
  // In a real implementation, this would deploy the fine-tuned model
  // For this example, we'll just log the model ID
  console.log(`Deploying fine-tuned model: ${modelId}`)

  // In a production environment, you would:
  // 1. Update your application to use the new model
  // 2. Monitor the model's performance
  // 3. Roll back if necessary

  return {
    success: true,
    modelId,
    deployedAt: Date.now(),
  }
}
