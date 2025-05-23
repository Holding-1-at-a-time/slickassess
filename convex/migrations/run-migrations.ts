import { internalMutation, internalAction } from "../_generated/server"
import { getPendingMigrations } from "./migration-framework"

// List of all migrations in order
const allMigrations = [
  require("./001-add-ai-notes-field").migration,
  // Add more migrations here as they are created
]

// Action to run all pending migrations
export const runAllMigrations = internalAction({
  handler: async (ctx) => {
    const pendingMigrations = await ctx.runQuery(getPendingMigrations)

    const results = []

    for (const migration of pendingMigrations) {
      // Find the corresponding migration function
      const migrationModule = allMigrations.find((m) => m.name === migration.name)

      if (migrationModule) {
        // Run the migration
        const result = await ctx.runMutation(migrationModule)
        results.push({
          name: migration.name,
          success: result,
        })
      }
    }

    return results
  },
})

// Scheduled job to run migrations
export const scheduledMigrationRunner = internalMutation({
  handler: async (ctx) => {
    // This would be called by a scheduled job
    const pendingMigrations = await ctx.db
      .query("migrations")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect()

    if (pendingMigrations.length > 0) {
      // Log that migrations are pending
      console.log(`Found ${pendingMigrations.length} pending migrations`)

      // Trigger the action to run migrations
      await ctx.scheduler.runAfter(0, "migrations:runAllMigrations")
    }
  },
})
