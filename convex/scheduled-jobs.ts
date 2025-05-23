/**
 * @description      :
 * @author           : rrome
 * @group            :
 * @created          : 22/05/2025 - 07:53:44
 *
 * MODIFICATION LOG
 * - Version         : 1.0.0
 * - Date            : 22/05/2025
 * - Author          : rrome
 * - Modification    :
 **/
"use node"

import { internalAction } from "./_generated/server"
import { v } from "convex/values"
import { internal } from "./_generated/api"
import { prepareTrainingData, createFineTuningJob, deployFineTunedModel } from "../lib/ai/training-pipeline"
import { logEvent } from "../lib/analytics/bigquery"

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

// Log an event to BigQuery
export const logEventToBigQuery = internalAction({
  args: {
    orgId: v.string(),
    eventType: v.string(),
    eventData: v.object({}),
    userId: v.optional(v.string()),
    timestamp: v.number(),
    eventId: v.id("analyticsEvents"),
  },
  handler: async (ctx, args) => {
    try {
      // Determine the appropriate BigQuery table based on event type
      let table = "generic_events"
      if (args.eventType.includes("appointment")) {
        table = "appointment_events"
      } else if (args.eventType.includes("invoice") || args.eventType.includes("payment")) {
        table = "invoice_events"
      } else if (args.eventType.includes("assessment")) {
        table = "assessment_events"
      } else if (args.eventType.includes("client")) {
        table = "client_events"
      } else if (args.eventType.includes("vehicle")) {
        table = "vehicle_events"
      }

      // Format the event for BigQuery
      const event = {
        eventId: args.eventId,
        orgId: args.orgId,
        eventType: args.eventType,
        ...args.eventData,
        userId: args.userId,
        timestamp: new Date(args.timestamp).toISOString(),
      }

      // Log to BigQuery
      const success = await logEvent("slickassess_dataset", table, event)

      // Update the event status in Convex
      if (success) {
        await ctx.runMutation(internal.analytics.markEventLogged, {
          eventId: args.eventId,
        })
      } else {
        await ctx.runMutation(internal.analytics.markEventFailed, {
          eventId: args.eventId,
        })
      }

      return success
    } catch (error) {
      console.error("Error logging event to BigQuery:", error)

      // Mark the event as failed in Convex
      await ctx.runMutation(internal.analytics.markEventFailed, {
        eventId: args.eventId,
      })

      return false
    }
  },
})

import { internalMutation } from "./_generated/server"

// Add more internal mutations to analytics.ts
export const markEventLogged = internalMutation({
  args: { eventId: v.id("analyticsEvents") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, {
      bigQueryLogged: true,
      bigQueryLoggedAt: Date.now(),
    })
  },
})

export const markEventFailed = internalMutation({
  args: { eventId: v.id("analyticsEvents") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, {
      bigQueryLogged: false,
      bigQueryError: true,
      bigQueryErrorAt: Date.now(),
    })
  },
})
