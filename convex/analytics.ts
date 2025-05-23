import { query } from "./_generated/server"
import { v } from "convex/values"
import { requireOrgRole } from "./roles"

// Fix for handling undefined/null clientId in revenue calculations
export const getTopClientsByRevenue = query({
  args: {
    orgId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { orgId } = requireOrgRole(ctx, args.orgId, ["admin"])
    const limit = args.limit || 5

    // Get all invoices for this organization
    const invoices = await ctx.db
      .query("invoices")
      .withIndex("by_orgId_createdAt", (q) => q.eq("orgId", orgId))
      .collect()

    // Group by client
    const revenueByClient = new Map()

    // Sum revenue per client - explicitly filter out undefined/null clientIds
    for (const invoice of invoices) {
      const clientId = invoice.clientId
      // Skip invoices without a valid clientId
      if (!clientId) {
        console.warn(`Invoice ${invoice._id} has no clientId, skipping from revenue analytics`)
        continue
      }
      const currentRevenue = revenueByClient.get(clientId) || 0
      revenueByClient.set(clientId, currentRevenue + invoice.amount)
    }

    // Convert to array and sort by revenue
    const sortedClients = Array.from(revenueByClient.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)

    // Get client details
    const result = []
    for (const [clientId, revenue] of sortedClients) {
      const client = await ctx.db.get(clientId)
      if (client) {
        result.push({
          clientId,
          name: client.name,
          revenue,
        })
      }
    }

    return result
  },
})
