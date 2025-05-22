import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireAuth } from "./utils/auth"

// Define the schema for client preferences
export const getByClientId = query({
  args: { clientId: v.string() },
  handler: async (ctx, args) => {
    // Get the auth context (including orgId)
    const { orgId } = await requireAuth(ctx)

    // Query for client preferences
    const preferences = await ctx.db
      .query("userClientPreferences")
      .withIndex("by_clientId_orgId", (q) => q.eq("clientId", args.clientId).eq("orgId", orgId))
      .first()

    return (
      preferences || {
        clientId: args.clientId,
        orgId,
        preferredDays: [],
        preferredTimeOfDay: "morning",
        preferredStaffId: "",
        communicationPreference: "email",
        reminderTiming: 24,
      }
    )
  },
})

// Upsert (create or update) client preferences
export const upsert = mutation({
  args: {
    clientId: v.string(),
    preferredDays: v.array(v.string()),
    preferredTimeOfDay: v.string(),
    preferredStaffId: v.string(),
    communicationPreference: v.string(),
    reminderTiming: v.number(),
  },
  handler: async (ctx, args) => {
    // Get the auth context (including orgId and userId)
    const { orgId, userId } = await requireAuth(ctx)

    // Check if preferences already exist
    const existing = await ctx.db
      .query("userClientPreferences")
      .withIndex("by_clientId_orgId", (q) => q.eq("clientId", args.clientId).eq("orgId", orgId))
      .first()

    if (existing) {
      // Update existing preferences
      await ctx.db.patch(existing._id, {
        preferredDays: args.preferredDays,
        preferredTimeOfDay: args.preferredTimeOfDay,
        preferredStaffId: args.preferredStaffId,
        communicationPreference: args.communicationPreference,
        reminderTiming: args.reminderTiming,
        updatedAt: Date.now(),
        updatedBy: userId,
      })
      return existing._id
    } else {
      // Create new preferences
      const id = await ctx.db.insert("userClientPreferences", {
        clientId: args.clientId,
        orgId,
        preferredDays: args.preferredDays,
        preferredTimeOfDay: args.preferredTimeOfDay,
        preferredStaffId: args.preferredStaffId,
        communicationPreference: args.communicationPreference,
        reminderTiming: args.reminderTiming,
        createdAt: Date.now(),
        createdBy: userId,
        updatedAt: Date.now(),
        updatedBy: userId,
      })
      return id
    }
  },
})
