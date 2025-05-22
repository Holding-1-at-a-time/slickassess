import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireOrgId } from "./utils/auth"

export const create = mutation({
  args: {
    userId: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()),
    read: v.boolean(),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx)
    const now = Date.now()

    // Get user record
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", args.userId))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    return await ctx.db.insert("notifications", {
      userId: user._id,
      orgId,
      type: args.type,
      title: args.title,
      message: args.message,
      link: args.link,
      read: args.read,
      createdAt: now,
    })
  },
})

export const getUserNotifications = query({
  args: {
    limit: v.optional(v.number()),
    includeRead: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }

    const orgId = identity.tokenIdentifier.split("|")[1].split(":")[0]
    const userId = identity.subject

    // Get user record
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", userId))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    let query = ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("orgId"), orgId))

    if (!args.includeRead) {
      query = query.filter((q) => q.eq(q.field("read"), false))
    }

    return await query.order("desc").take(args.limit || 10)
  },
})

export const markAsRead = mutation({
  args: {
    notificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx)
    const notification = await ctx.db.get(args.notificationId)

    if (!notification || notification.orgId !== orgId) {
      throw new Error("Notification not found or access denied")
    }

    await ctx.db.patch(args.notificationId, {
      read: true,
    })

    return true
  },
})

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity()
    if (!identity) {
      throw new Error("Not authenticated")
    }

    const orgId = identity.tokenIdentifier.split("|")[1].split(":")[0]
    const userId = identity.subject

    // Get user record
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", userId))
      .first()

    if (!user) {
      throw new Error("User not found")
    }

    // Get all unread notifications
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", user._id))
      .filter((q) => q.eq(q.field("orgId"), orgId).eq(q.field("read"), false))
      .collect()

    // Mark all as read
    for (const notification of notifications) {
      await ctx.db.patch(notification._id, {
        read: true,
      })
    }

    return notifications.length
  },
})
