import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { nanoid } from "nanoid"
import { requireAuth } from "./utils/auth"
import QRCode from "qrcode"

// Create a new tenant
export const create = mutation({
  args: {
    name: v.string(),
    branding: v.optional(
      v.object({
        logo: v.optional(v.string()),
        primaryColor: v.optional(v.string()),
        secondaryColor: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await requireAuth(ctx)
    const now = Date.now()

    // Generate a unique slug for the QR code
    const qrSlug = nanoid(10)

    // Generate the public URL
    const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/scan/${qrSlug}`

    // Generate QR code as data URL
    const qrCodeUrl = await QRCode.toDataURL(publicUrl, {
      width: 512,
      margin: 1,
      color: {
        dark: "#00AE98",
        light: "#FFFFFF",
      },
    })

    // Create the tenant
    const tenantId = await ctx.db.insert("tenants", {
      name: args.name,
      orgId,
      qrSlug,
      qrCodeUrl,
      branding: args.branding || {
        primaryColor: "#00AE98",
        secondaryColor: "#707070",
      },
      createdAt: now,
      updatedAt: now,
    })

    // Create audit log
    await ctx.db.insert("auditLogs", {
      orgId,
      clerkId: userId,
      action: "createTenant",
      resourceType: "tenant",
      resourceId: tenantId.toString(),
      createdAt: now,
    })

    return tenantId
  },
})

// Get tenant by organization ID
export const getByOrgId = query({
  handler: async (ctx) => {
    const { orgId } = await requireAuth(ctx)

    return await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .first()
  },
})

// Get tenant by QR slug (public)
export const getByQrSlug = query({
  args: { qrSlug: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tenants")
      .withIndex("by_qrSlug", (q) => q.eq("qrSlug", args.qrSlug))
      .first()
  },
})

// Regenerate QR code
export const regenerateQrCode = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const { userId, orgId } = await requireAuth(ctx)

    // Get the tenant
    const tenant = await ctx.db.get(args.tenantId)
    if (!tenant || tenant.orgId !== orgId) {
      throw new Error("Tenant not found or access denied")
    }

    // Generate a new unique slug
    const qrSlug = nanoid(10)

    // Generate the public URL
    const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/scan/${qrSlug}`

    // Generate QR code as data URL
    const qrCodeUrl = await QRCode.toDataURL(publicUrl, {
      width: 512,
      margin: 1,
      color: {
        dark: "#00AE98",
        light: "#FFFFFF",
      },
    })

    // Update the tenant
    await ctx.db.patch(args.tenantId, {
      qrSlug,
      qrCodeUrl,
      updatedAt: Date.now(),
    })

    // Create audit log
    await ctx.db.insert("auditLogs", {
      orgId,
      clerkId: userId,
      action: "regenerateQrCode",
      resourceType: "tenant",
      resourceId: args.tenantId.toString(),
      createdAt: Date.now(),
    })

    return {
      qrSlug,
      qrCodeUrl,
    }
  },
})

// Update tenant branding
export const updateBranding = mutation({
  args: {
    tenantId: v.id("tenants"),
    branding: v.object({
      logo: v.optional(v.string()),
      primaryColor: v.optional(v.string()),
      secondaryColor: v.optional(v.string()),
    }),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await requireAuth(ctx)

    // Get the tenant
    const tenant = await ctx.db.get(args.tenantId)
    if (!tenant || tenant.orgId !== orgId) {
      throw new Error("Tenant not found or access denied")
    }

    // Update the tenant
    await ctx.db.patch(args.tenantId, {
      branding: args.branding,
      updatedAt: Date.now(),
    })

    // Create audit log
    await ctx.db.insert("auditLogs", {
      orgId,
      clerkId: userId,
      action: "updateTenantBranding",
      resourceType: "tenant",
      resourceId: args.tenantId.toString(),
      createdAt: Date.now(),
    })

    return true
  },
})
