import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireOrgId, requireAuth } from "./utils/auth"

export const create = mutation({
  args: {
    clientId: v.id("clients"),
    vin: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    color: v.optional(v.string()),
    licensePlate: v.optional(v.string()),
    mileage: v.optional(v.number()),
    exteriorCondition: v.optional(v.string()),
    interiorCondition: v.optional(v.string()),
    notes: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await requireAuth(ctx)
    const now = Date.now()

    // Verify that the client exists and belongs to the current organization
    const client = await ctx.db.get(args.clientId)
    if (!client || client.orgId !== orgId) {
      throw new Error("Client not found or invalid organization")
    }

    // Create the vehicle
    const vehicleId = await ctx.db.insert("vehicles", {
      orgId,
      clerkId: userId,
      clientId: args.clientId,
      vin: args.vin,
      make: args.make,
      model: args.model,
      year: args.year,
      color: args.color || "",
      licensePlate: args.licensePlate || "",
      mileage: args.mileage || 0,
      exteriorCondition: args.exteriorCondition || "",
      interiorCondition: args.interiorCondition || "",
      notes: args.notes || "",
      features: args.features || [],
      mainImageId: null,
      lastAssessmentId: null,
      lastAssessmentAt: null,
      createdAt: now,
      updatedAt: now,
    })

    // Log the action
    await ctx.db.insert("auditLogs", {
      orgId,
      clerkId: userId,
      action: "createVehicle",
      resourceType: "vehicle",
      resourceId: vehicleId,
      createdAt: now,
    })

    return vehicleId
  },
})

export const getById = query({
  args: { id: v.id("vehicles") },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx)

    // Get the vehicle
    const vehicle = await ctx.db.get(args.id)

    // Verify that the vehicle exists and belongs to the current organization
    if (!vehicle || vehicle.orgId !== orgId) {
      throw new Error("Vehicle not found or invalid organization")
    }

    // Get the client
    const client = await ctx.db.get(vehicle.clientId)

    // Get the vehicle images
    const images = await ctx.db
      .query("vehicleImages")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", args.id))
      .collect()

    // Get the latest assessment if it exists
    let latestAssessment = null
    if (vehicle.lastAssessmentId) {
      latestAssessment = await ctx.db.get(vehicle.lastAssessmentId)
    }

    return {
      ...vehicle,
      client,
      images,
      latestAssessment,
    }
  },
})

export const list = query({
  args: {
    search: v.optional(v.string()),
    page: v.number(),
    limit: v.number(),
    clientId: v.optional(v.id("clients")),
    sortBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const orgId = await requireOrgId(ctx)
    const { search, page, limit, clientId, sortBy } = args
    const skip = (page - 1) * limit

    // Start with a query filtered by the current organization
    let vehiclesQuery = ctx.db.query("vehicles").withIndex("by_orgId", (q) => q.eq("orgId", orgId))

    // If clientId is provided, filter by client
    if (clientId) {
      vehiclesQuery = ctx.db
        .query("vehicles")
        .withIndex("by_clientId", (q) => q.eq("clientId", clientId))
        // Still need to filter by orgId for security
        .filter((q) => q.eq(q.field("orgId"), orgId))
    }

    // Apply search filter if provided
    if (search && search.trim() !== "") {
      const searchTerm = search.toLowerCase().trim()
      vehiclesQuery = vehiclesQuery.filter((q) =>
        q.or(
          q.contains(q.lower(q.field("vin")), searchTerm),
          q.contains(q.lower(q.field("make")), searchTerm),
          q.contains(q.lower(q.field("model")), searchTerm),
          q.contains(q.lower(q.field("licensePlate")), searchTerm),
        ),
      )
    }

    // Apply sorting
    if (sortBy === "year_desc") {
      vehiclesQuery = vehiclesQuery.order("desc", (q) => q.field("year"))
    } else if (sortBy === "year_asc") {
      vehiclesQuery = vehiclesQuery.order("asc", (q) => q.field("year"))
    } else if (sortBy === "make_asc") {
      vehiclesQuery = vehiclesQuery.order("asc", (q) => q.field("make"))
    } else if (sortBy === "make_desc") {
      vehiclesQuery = vehiclesQuery.order("desc", (q) => q.field("make"))
    } else if (sortBy === "lastAssessment") {
      vehiclesQuery = vehiclesQuery.order("desc", (q) => q.field("lastAssessmentAt"))
    } else {
      // Default sorting by creation date
      vehiclesQuery = vehiclesQuery.order("desc", (q) => q.field("createdAt"))
    }

    // Get the total count for pagination
    const totalCount = await vehiclesQuery.collect().then((vehicles) => vehicles.length)

    // Apply pagination
    const vehicles = await vehiclesQuery.skip(skip).take(limit).collect()

    // For each vehicle, get the client name
    const vehiclesWithClientNames = await Promise.all(
      vehicles.map(async (vehicle) => {
        const client = await ctx.db.get(vehicle.clientId)
        return {
          ...vehicle,
          clientName: client?.name || "Unknown Client",
        }
      }),
    )

    return {
      vehicles: vehiclesWithClientNames,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
      currentPage: page,
    }
  },
})

export const update = mutation({
  args: {
    id: v.id("vehicles"),
    clientId: v.optional(v.id("clients")),
    vin: v.optional(v.string()),
    make: v.optional(v.string()),
    model: v.optional(v.string()),
    year: v.optional(v.number()),
    color: v.optional(v.string()),
    licensePlate: v.optional(v.string()),
    mileage: v.optional(v.number()),
    exteriorCondition: v.optional(v.string()),
    interiorCondition: v.optional(v.string()),
    notes: v.optional(v.string()),
    features: v.optional(v.array(v.string())),
    mainImageId: v.optional(v.id("vehicleImages")),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await requireAuth(ctx)
    const now = Date.now()

    // Get the vehicle
    const vehicle = await ctx.db.get(args.id)

    // Verify that the vehicle exists and belongs to the current organization
    if (!vehicle || vehicle.orgId !== orgId) {
      throw new Error("Vehicle not found or invalid organization")
    }

    // If clientId is provided, verify that the client exists and belongs to the current organization
    if (args.clientId) {
      const client = await ctx.db.get(args.clientId)
      if (!client || client.orgId !== orgId) {
        throw new Error("Client not found or invalid organization")
      }
    }

    // Update the vehicle
    await ctx.db.patch(args.id, {
      ...(args.clientId !== undefined && { clientId: args.clientId }),
      ...(args.vin !== undefined && { vin: args.vin }),
      ...(args.make !== undefined && { make: args.make }),
      ...(args.model !== undefined && { model: args.model }),
      ...(args.year !== undefined && { year: args.year }),
      ...(args.color !== undefined && { color: args.color }),
      ...(args.licensePlate !== undefined && { licensePlate: args.licensePlate }),
      ...(args.mileage !== undefined && { mileage: args.mileage }),
      ...(args.exteriorCondition !== undefined && { exteriorCondition: args.exteriorCondition }),
      ...(args.interiorCondition !== undefined && { interiorCondition: args.interiorCondition }),
      ...(args.notes !== undefined && { notes: args.notes }),
      ...(args.features !== undefined && { features: args.features }),
      ...(args.mainImageId !== undefined && { mainImageId: args.mainImageId }),
      updatedAt: now,
    })

    // Log the action
    await ctx.db.insert("auditLogs", {
      orgId,
      clerkId: userId,
      action: "updateVehicle",
      resourceType: "vehicle",
      resourceId: args.id,
      createdAt: now,
    })

    return args.id
  },
})

export const remove = mutation({
  args: { id: v.id("vehicles") },
  handler: async (ctx, args) => {
    const { userId, orgId } = await requireAuth(ctx)
    const now = Date.now()

    // Get the vehicle
    const vehicle = await ctx.db.get(args.id)

    // Verify that the vehicle exists and belongs to the current organization
    if (!vehicle || vehicle.orgId !== orgId) {
      throw new Error("Vehicle not found or invalid organization")
    }

    // Delete the vehicle
    await ctx.db.delete(args.id)

    // Log the action
    await ctx.db.insert("auditLogs", {
      orgId,
      clerkId: userId,
      action: "deleteVehicle",
      resourceType: "vehicle",
      resourceId: args.id,
      createdAt: now,
    })

    return args.id
  },
})
