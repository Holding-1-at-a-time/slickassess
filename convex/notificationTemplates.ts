import { query } from "./_generated/server"
import { v } from "convex/values"
import { requireAuth } from "./utils/auth"

// Get notification template by type and channel
export const getByType = query({
  args: {
    orgId: v.string(),
    type: v.string(),
    channel: v.string(),
  },
  handler: async (ctx, args) => {
    // This query can be called with an explicit orgId from the admin job
    // or with the current user's orgId for regular usage
    let orgId = args.orgId

    // If no orgId provided, get it from auth context
    if (!orgId) {
      const auth = await requireAuth(ctx)
      orgId = auth.orgId
    }

    // Get the template
    const template = await ctx.db
      .query("notificationTemplates")
      .withIndex("by_orgId_type_channel", (q) => q.eq("orgId", orgId).eq("type", args.type).eq("channel", args.channel))
      .first()

    return template
  },
})
