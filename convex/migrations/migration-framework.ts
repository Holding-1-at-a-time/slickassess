import { internalMutation, internalQuery } from "./_generated/server"
import { v } from "convex/values"
import type { Id } from "./_generated/dataModel"
import { defineTable } from "convex/server"

// Define the migration record structure
export interface MigrationRecord {
  version: string
  name: string
  description: string
  appliedAt: number
  status: "pending" | "running" | "completed" | "failed"
  error?: string
  duration?: number
}

// Define the migration table
export const migrations = defineTable({
  version: v.string(),
  name: v.string(),
  description: v.string(),
  appliedAt: v.number(),
  status: v.string(),
  error: v.optional(v.string()),
  duration: v.optional(v.number()),
})
  .index("by_version", ["version"])
  .index("by_status", ["status"])
  .index("by_applied_at", ["appliedAt"])

// Query to get all migrations
export const getAllMigrations = internalQuery({
  handler: async (ctx) => {
    return await ctx.db.query("migrations").collect()
  },
})

// Query to get pending migrations
export const getPendingMigrations = internalQuery({
  handler: async (ctx) => {
    return await ctx.db
      .query("migrations")
      .filter((q) => q.eq(q.field("status"), "pending"))
      .collect()
  },
})

// Mutation to create a migration record
export const createMigration = internalMutation({
  args: {
    version: v.string(),
    name: v.string(),
    description: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("migrations", {
      version: args.version,
      name: args.name,
      description: args.description,
      appliedAt: Date.now(),
      status: "pending",
    })
  },
})

// Mutation to update migration status
export const updateMigrationStatus = internalMutation({
  args: {
    id: v.id("migrations"),
    status: v.string(),
    error: v.optional(v.string()),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.patch(args.id, {
      status: args.status,
      error: args.error,
      duration: args.duration,
    })
  },
})

// Helper function to run a migration
export const runMigration = async (ctx: any, migrationId: Id<"migrations">, migrationFn: () => Promise<void>) => {
  const startTime = Date.now()

  // Update status to running
  await ctx.db.patch(migrationId, { status: "running" })

  try {
    // Run the migration
    await migrationFn()

    // Update status to completed
    const endTime = Date.now()
    await ctx.db.patch(migrationId, {
      status: "completed",
      duration: endTime - startTime,
    })

    return true
  } catch (error) {
    // Update status to failed
    const endTime = Date.now()
    await ctx.db.patch(migrationId, {
      status: "failed",
      error: error instanceof Error ? error.message : String(error),
      duration: endTime - startTime,
    })

    return false
  }
}
