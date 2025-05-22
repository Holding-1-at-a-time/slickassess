import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireAuth, requireOrgRole } from "./utils/auth"

// Query to get all clients for the current organization
export const getClients = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    sortBy: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get the auth context (including orgId)
    const { orgId } = await requireAuth(ctx)

    // Start with a query filtered by the current organization
    let clientsQuery = ctx.db.query("clients").withIndex("by_orgId", (q) => q.eq("orgId", orgId))

    // Apply status filter if provided
    if (args.status) {
      clientsQuery = clientsQuery.filter((q) => q.eq(q.field("status"), args.status))
    }

    // Apply search filter if provided
    if (args.search && args.search.trim() !== "") {
      const search = args.search.toLowerCase().trim()
      clientsQuery = clientsQuery.filter((q) => q.contains(q.lower(q.field("name")), search))
    }

    // Apply sorting if provided
    if (args.sortBy === "name_asc") {
      clientsQuery = clientsQuery.order("asc")
    } else if (args.sortBy === "name_desc") {
      clientsQuery = clientsQuery.order("desc")
    } else if (args.sortBy === "recent") {
      clientsQuery = clientsQuery.order("desc", (q) => q.field("createdAt"))
    } else {
      // Default sorting
      clientsQuery = clientsQuery.order("asc", (q) => q.field("name"))
    }

    // Apply limit if provided
    if (args.limit) {
      clientsQuery = clientsQuery.take(args.limit)
    }

    // Execute the query
    const clients = await clientsQuery.collect()

    return clients
  },
})

// Query to get a specific client by ID
export const getClient = query({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    // Get the auth context (including orgId)
    const { orgId } = await requireAuth(ctx)

    // Get the client
    const client = await ctx.db.get(args.clientId)

    // Verify that the client exists and belongs to the current organization
    if (!client || client.orgId !== orgId) {
      throw new Error("Client not found or access denied")
    }

    return client
  },
})

// Mutation to create a new client
export const createClient = mutation({
  args: {
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the auth context (including orgId and userId)
    const { orgId, userId } = await requireAuth(ctx)

    // Create the client
    const clientId = await ctx.db.insert("clients", {
      name: args.name,
      email: args.email || "",
      phone: args.phone || "",
      address: args.address || "",
      city: args.city || "",
      state: args.state || "",
      zipCode: args.zipCode || "",
      notes: args.notes || "",
      status: "active",
      orgId, // Always include orgId for data isolation
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    return clientId
  },
})

// Mutation to update a client
export const updateClient = mutation({
  args: {
    clientId: v.id("clients"),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the auth context (including orgId)
    const { orgId } = await requireAuth(ctx)

    // Get the client
    const client = await ctx.db.get(args.clientId)

    // Verify that the client exists and belongs to the current organization
    if (!client || client.orgId !== orgId) {
      throw new Error("Client not found or access denied")
    }

    // Update the client
    await ctx.db.patch(args.clientId, {
      ...(args.name !== undefined && { name: args.name }),
      ...(args.email !== undefined && { email: args.email }),
      ...(args.phone !== undefined && { phone: args.phone }),
      ...(args.address !== undefined && { address: args.address }),
      ...(args.city !== undefined && { city: args.city }),
      ...(args.state !== undefined && { state: args.state }),
      ...(args.zipCode !== undefined && { zipCode: args.zipCode }),
      ...(args.notes !== undefined && { notes: args.notes }),
      ...(args.status !== undefined && { status: args.status }),
      updatedAt: Date.now(),
    })

    return args.clientId
  },
})

// Mutation to delete a client (admin only)
export const deleteClient = mutation({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    // Get the auth context (including orgId) and require admin role
    const { orgId } = await requireOrgRole(ctx, ["admin"])

    // Get the client
    const client = await ctx.db.get(args.clientId)

    // Verify that the client exists and belongs to the current organization
    if (!client || client.orgId !== orgId) {
      throw new Error("Client not found or access denied")
    }

    // Delete the client
    await ctx.db.delete(args.clientId)

    return args.clientId
  },
})
