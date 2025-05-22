import { internalAction } from "./_generated/server"
import { internal } from "./_generated/api"
import { prepareTrainingData, createFineTuningJob, deployFineTunedModel } from "../lib/ai/training-pipeline"

/**
 * Scheduled job to train the AI model with new feedback
 * This would be triggered by a cron job or similar mechanism
 */
export const trainAIModel = internalAction({
  args: {},
  handler: async (ctx) => {
    console.log("Starting AI model training job")

    try {
      // Get the latest feedback data
      const { feedback, imageUrls } = await ctx.runQuery(internal.aiTraining.getFeedbackForTraining, {
        limit: 1000, // Limit to the most recent 1000 feedback entries
        since: Date.now() - 30 * 24 * 60 * 60 * 1000, // Only feedback from the last 30 days
      })

      if (feedback.length === 0) {
        console.log("No feedback data available for training")
        return {
          success: false,
          reason: "No feedback data available",
        }
      }

      console.log(`Found ${feedback.length} feedback entries for training`)

      // Prepare the training data
      const trainingData = await prepareTrainingData(feedback, imageUrls)

      if (!trainingData || trainingData.length === 0) {
        console.log("No valid training data could be prepared")
        return {
          success: false,
          reason: "No valid training data",
        }
      }

      console.log(`Prepared ${trainingData.length} training examples`)

      // Create a fine-tuning job
      const jobId = await createFineTuningJob(trainingData)

      console.log(`Created fine-tuning job: ${jobId}`)

      // In a real implementation, you would:
      // 1. Store the job ID in the database
      // 2. Set up a separate job to check the status periodically
      // 3. Deploy the model when the job is complete

      // For this example, we'll simulate a successful training and deployment
      const modelId = `ft:damage-detector-${Date.now()}`

      // Create a new model version record
      const modelVersionId = await ctx.runMutation(internal.aiTraining.initiateTraining, {
        modelName: "damage-detection",
        version: `1.0.${Date.now()}`,
      })

      // Simulate deployment
      const deploymentResult = await deployFineTunedModel(modelId)

      // Update the model version record
      await ctx.runMutation(internal.aiTraining.deployModel, {
        modelVersionId: modelVersionId.modelVersionId,
      })

      return {
        success: true,
        jobId,
        modelId,
        modelVersionId: modelVersionId.modelVersionId,
      }
    } catch (error: any) {
      console.error("Error training AI model:", error)
      return {
        success: false,
        error: error.message || "Unknown error",
      }
    }
  },
})
