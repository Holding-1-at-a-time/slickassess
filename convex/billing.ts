import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireOrgRole } from "./utils/auth"

// Get or create a Stripe customer ID for an organization
export const getOrCreateCustomerId = mutation({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    // Check if customer already exists
    const existingCustomer = await ctx.db
      .query("billingCustomers")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .first()

    if (existingCustomer) {
      return existingCustomer.stripeCustomerId
    }

    // If we're here, we need to create a new customer in Stripe
    // This would normally call Stripe API, but we'll simulate it here
    // In a real implementation, you'd use a Stripe client in an action
    const now = Date.now()
    const stripeCustomerId = `cus_${Math.random().toString(36).substring(2, 15)}`

    // Save the customer ID to our database
    await ctx.db.insert("billingCustomers", {
      orgId: args.orgId,
      stripeCustomerId,
      createdAt: now,
      updatedAt: now,
    })

    return stripeCustomerId
  },
})

// Save a subscription ID for an organization
export const saveSubscriptionId = mutation({
  args: {
    orgId: v.string(),
    subscriptionId: v.string(),
    planId: v.optional(v.string()),
    status: v.optional(v.string()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Check if subscription already exists
    const existingSubscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .first()

    if (existingSubscription) {
      // Update existing subscription
      await ctx.db.patch(existingSubscription._id, {
        stripeSubscriptionId: args.subscriptionId,
        status: args.status || "active",
        planId: args.planId || existingSubscription.planId,
        currentPeriodStart: args.currentPeriodStart || now,
        currentPeriodEnd: args.currentPeriodEnd || now + 30 * 24 * 60 * 60 * 1000, // Default to 30 days
        updatedAt: now,
      })
      return existingSubscription._id
    }

    // Create new subscription
    const subscriptionId = await ctx.db.insert("subscriptions", {
      orgId: args.orgId,
      stripeSubscriptionId: args.subscriptionId,
      status: args.status || "active",
      planId: args.planId || "default_plan",
      currentPeriodStart: args.currentPeriodStart || now,
      currentPeriodEnd: args.currentPeriodEnd || now + 30 * 24 * 60 * 60 * 1000, // Default to 30 days
      cancelAtPeriodEnd: false,
      createdAt: now,
      updatedAt: now,
    })

    return subscriptionId
  },
})

// Handle a paid invoice
export const handleInvoicePaid = mutation({
  args: {
    orgId: v.string(),
    invoiceId: v.string(),
    amount: v.optional(v.number()),
    invoiceUrl: v.optional(v.string()),
    invoicePdf: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()

    // Get customer ID
    const customer = await ctx.db
      .query("billingCustomers")
      .withIndex("by_orgId", (q) => q.eq("orgId", args.orgId))
      .first()

    if (!customer) {
      throw new Error(`No customer found for org ${args.orgId}`)
    }

    // Create invoice record
    const invoiceId = await ctx.db.insert("invoices", {
      orgId: args.orgId,
      stripeInvoiceId: args.invoiceId,
      stripeCustomerId: customer.stripeCustomerId,
      amount: args.amount || 0,
      status: "paid",
      invoiceUrl: args.invoiceUrl,
      invoicePdf: args.invoicePdf,
      createdAt: now,
      paidAt: now,
    })

    return invoiceId
  },
})

// Get subscription status for an organization
export const getSubscriptionStatus = query({
  args: { orgId: v.string() },
  handler: async (ctx, args) => {
    const { orgId } = requireOrgRole(ctx, args.orgId, ["admin", "member"])

    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .first()

    if (!subscription) {
      return { status: "none", isActive: false }
    }

    const isActive = subscription.status === "active" && subscription.currentPeriodEnd > Date.now()

    return {
      status: subscription.status,
      isActive,
      planId: subscription.planId,
      currentPeriodEnd: subscription.currentPeriodEnd,
      cancelAtPeriodEnd: subscription.cancelAtPeriodEnd,
    }
  },
})

// Get invoices for an organization
export const getInvoices = query({
  args: { orgId: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const { orgId } = requireOrgRole(ctx, args.orgId, ["admin"])

    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_orgId_createdAt", (q) => q.eq("orgId", orgId))
      .order("desc")
      .take(args.limit || 10)

    return invoices
  },
})
