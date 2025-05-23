import { internalMutation } from "../_generated/server"
import { runMigration } from "./migration-framework"

// Define the migration
export const migration = internalMutation({
  handler: async (ctx) => {
    // Create migration record
    const migrationId = await ctx.db.insert("migrations", {
      version: "001",
      name: "add-ai-notes-field",
      description: "Add aiNotes field to assessments table",
      appliedAt: Date.now(),
      status: "pending",
    })

    // Run the migration
    return await runMigration(ctx, migrationId, async () => {
      // Get all assessments
      const assessments = await ctx.db.query("assessments").collect()

      // Update each assessment to add the aiNotes field
      for (const assessment of assessments) {
        await ctx.db.patch(assessment._id, {
          aiNotes: assessment.notes || "",
        })
      }
    })
  },
})
