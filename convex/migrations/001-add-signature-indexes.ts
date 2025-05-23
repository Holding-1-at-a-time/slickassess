// Migration helper for adding new indexes safely
import { internalMutation } from "../_generated/server"

export const addSignatureIndexes = internalMutation({
  args: {},
  handler: async (ctx) => {
    // This migration adds the new indexes for signature analytics
    // Convex will automatically create indexes when the schema is updated
    // This file serves as documentation of the migration

    console.log("Migration: Adding signature analytics indexes")
    console.log("- by_org index for digitalSignatures")
    console.log("- by_org_and_createdAt compound index for digitalSignatures")

    // Check if we need to backfill orgId for existing signatures
    const signaturesWithoutOrgId = await ctx.db
      .query("digitalSignatures")
      .filter((q) => q.eq(q.field("orgId"), undefined))
      .take(10)

    if (signaturesWithoutOrgId.length > 0) {
      console.log(`Found ${signaturesWithoutOrgId.length} signatures without orgId`)
      console.log("Manual backfill may be required")
    }

    return { success: true, message: "Migration completed" }
  },
})
