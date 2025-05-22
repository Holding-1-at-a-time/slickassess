import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireAuth, requireOrgRole } from "./utils/auth"

// Query to get organization settings
export const getSettings = query({
  args: {},
  handler: async (ctx) => {
    // Get the auth context (including orgId)
    const { orgId } = await requireAuth(ctx)

    // Get settings for the current organization
    const settings = await ctx.db
      .query("settings")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .first()

    return settings || { orgId }
  },
})

// Mutation to update organization settings (admin only)
export const updateSettings = mutation({
  args: {
    theme: v.optional(v.string()),
    notificationPreferences: v.optional(v.object({})),
    customFields: v.optional(v.array(v.object({}))),
  },
  handler: async (ctx, args) => {
    // Get the auth context (including orgId) and require admin role
    const { orgId } = await requireOrgRole(ctx, "admin")

    // Check if settings already exist for this organization
    const existingSettings = await ctx.db
      .query("settings")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .first()

    if (existingSettings) {
      // Update existing settings
      await ctx.db.patch(existingSettings._id, {
        ...(args.theme !== undefined && { theme: args.theme }),
        ...(args.notificationPreferences !== undefined && { notificationPreferences: args.notificationPreferences }),
        ...(args.customFields !== undefined && { customFields: args.customFields }),
      })
      return existingSettings._id
    } else {
      // Create new settings
      const settingsId = await ctx.db.insert("settings", {
        orgId,
        ...(args.theme !== undefined && { theme: args.theme }),
        ...(args.notificationPreferences !== undefined && { notificationPreferences: args.notificationPreferences }),
        ...(args.customFields !== undefined && { customFields: args.customFields }),
      })
      return settingsId
    }
  },
})
