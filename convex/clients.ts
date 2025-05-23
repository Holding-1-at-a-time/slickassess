import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireAuth, requirePermission } from "./utils/auth"
import { Permission } from "@/lib/permissions/permission-types"
import { validateWithZod } from "./utils/validation"
import { createClientSchema, updateClientSchema, deleteClientSchema } from "./schemas/client-schemas"
import { ConvexError } from "convex/server"

// Query to get all clients for the current organization
export const getClients = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(v.string()),
    sortBy: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get the auth context and check permission
    await requirePermission(ctx, Permission.VIEW_CLIENTS)
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
    // Get the auth context and check permission
    await requirePermission(ctx, Permission.VIEW_CLIENTS)
    const { orgId } = await requireAuth(ctx)

    // Get the client
    const client = await ctx.db.get(args.clientId)

    // Verify that the client exists and belongs to the current organization
    if (!client || client.orgId !== orgId) {
      throw new ConvexError({
        code: 404,
        message: "Client not found or access denied",
      })
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
    // Get the auth context and check permission
    await requirePermission(ctx, Permission.CREATE_CLIENTS)
    const { userId, orgId } = await requireAuth(ctx)

    // Validate input data
    const validatedData = validateWithZod(createClientSchema, args)

    // Create the client
    const clientId = await ctx.db.insert("clients", {
      name: validatedData.name,
      email: validatedData.email || "",
      phone: validatedData.phone || "",
      address: validatedData.address || "",
      city: validatedData.city || "",
      state: validatedData.state || "",
      zipCode: validatedData.zipCode || "",
      notes: validatedData.notes || "",
      status: "active",
      orgId, // Always include orgId for data isolation
      createdBy: userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    // Log the action
    await ctx.db.insert("auditLogs", {
      orgId,
      userId,
      action: "createClient",
      resourceType: "client",
      resourceId: clientId,
      createdAt: Date.now(),
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
    // Get the auth context and check permission
    await requirePermission(ctx, Permission.EDIT_CLIENTS)
    const { userId, orgId } = await requireAuth(ctx)

    // Validate input data
    const validatedData = validateWithZod(updateClientSchema, args)

    // Get the client
    const client = await ctx.db.get(args.clientId)

    // Verify that the client exists and belongs to the current organization
    if (!client || client.orgId !== orgId) {
      throw new ConvexError({
        code: 404,
        message: "Client not found or access denied",
      })
    }

    // Update the client
    await ctx.db.patch(args.clientId, {
      ...(validatedData.name !== undefined && { name: validatedData.name }),
      ...(validatedData.email !== undefined && { email: validatedData.email }),
      ...(validatedData.phone !== undefined && { phone: validatedData.phone }),
      ...(validatedData.address !== undefined && { address: validatedData.address }),
      ...(validatedData.city !== undefined && { city: validatedData.city }),
      ...(validatedData.state !== undefined && { state: validatedData.state }),
      ...(validatedData.zipCode !== undefined && { zipCode: validatedData.zipCode }),
      ...(validatedData.notes !== undefined && { notes: validatedData.notes }),
      ...(validatedData.status !== undefined && { status: validatedData.status }),
      updatedAt: Date.now(),
    })

    // Log the action
    await ctx.db.insert("auditLogs", {
      orgId,
      userId,
      action: "updateClient",
      resourceType: "client",
      resourceId: args.clientId,
      createdAt: Date.now(),
    })

    return args.clientId
  },
})

// Mutation to delete a client (admin only)
export const deleteClient = mutation({
  args: { clientId: v.id("clients") },
  handler: async (ctx, args) => {
    // Get the auth context and check permission
    await requirePermission(ctx, Permission.DELETE_CLIENTS)
    const { userId, orgId } = await requireAuth(ctx)

    // Validate input data
    const validatedData = validateWithZod(deleteClientSchema, { clientId: args.clientId })

    // Get the client
    const client = await ctx.db.get(args.clientId)

    // Verify that the client exists and belongs to the current organization
    if (!client || client.orgId !== orgId) {
      throw new ConvexError({
        code: 404,
        message: "Client not found or access denied",
      })
    }

    // Check if client has any vehicles
    const vehicles = await ctx.db
      .query("vehicles")
      .withIndex("by_clientId", (q) => q.eq("clientId", args.clientId))
      .first()

    if (vehicles) {
      throw new ConvexError({
        code: 400,
        message: "Cannot delete client with associated vehicles. Please delete the vehicles first.",
      })
    }

    // Delete the client
    await ctx.db.delete(args.clientId)

    // Log the action
    await ctx.db.insert("auditLogs", {
      orgId,
      userId,
      action: "deleteClient",
      resourceType: "client",
      resourceId: args.clientId,
      createdAt: Date.now(),
    })

    return args.clientId
  },
})
