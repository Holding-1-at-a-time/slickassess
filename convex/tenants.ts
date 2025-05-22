import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { nanoid } from "nanoid"
import { ConvexError } from "convex/values"
import { requireAuth } from "./utils/auth"
import QRCode from "qrcode"

// Helper function to safely get app URL with fallback
function getAppUrl(): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL
  if (!appUrl) {
    throw new ConvexError("NEXT_PUBLIC_APP_URL environment variable is not set")
  }
  return appUrl
}

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

    // Check if tenant already exists for this org
    const existingTenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .first()

    if (existingTenant) {
      throw new ConvexError("Tenant already exists for this organization")
    }

    // Generate a unique slug for the QR code
    const qrSlug = nanoid(10)

    // Generate the public URL
    const publicUrl = `${getAppUrl()}/scan/${qrSlug}`

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
      qrSlugs: [{ slug: qrSlug, active: true, createdAt: now }],
      activeQrSlug: qrSlug,
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
    // First try to find a tenant with this as the active slug
    const tenantByActiveSlug = await ctx.db
      .query("tenants")
      .withIndex("by_activeQrSlug", (q) => q.eq("activeQrSlug", args.qrSlug))
      .first()

    if (tenantByActiveSlug) {
      return tenantByActiveSlug
    }

    // If not found, this QR code is no longer valid
    return null
  },
})

// Regenerate QR code
export const regenerateQrCode = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, args) => {
    const { userId, orgId } = await requireAuth(ctx)
    const now = Date.now()

    // Get the tenant
    const tenant = await ctx.db.get(args.tenantId)
    if (!tenant) {
      throw new ConvexError("Tenant not found")
    }

    // Verify the tenant belongs to the user's organization
    if (tenant.orgId !== orgId) {
      throw new ConvexError("Access denied")
    }

    // Generate a new unique slug
    const qrSlug = nanoid(10)

    // Generate the public URL
    const publicUrl = `${getAppUrl()}/scan/${qrSlug}`

    // Generate QR code as data URL
    const qrCodeUrl = await QRCode.toDataURL(publicUrl, {
      width: 512,
      margin: 1,
      color: {
        dark: "#00AE98",
        light: "#FFFFFF",
      },
    })

    // Update the tenant with the new QR code and mark the old one as inactive
    const qrSlugs = [...(tenant.qrSlugs || [])].map((slug) => ({
      ...slug,
      active: false,
    }))

    // Add the new slug
    qrSlugs.push({
      slug: qrSlug,
      active: true,
      createdAt: now,
    })

    // Update the tenant
    await ctx.db.patch(args.tenantId, {
      qrSlugs,
      activeQrSlug: qrSlug,
      qrCodeUrl,
      updatedAt: now,
    })

    // Create audit log
    await ctx.db.insert("auditLogs", {
      orgId,
      clerkId: userId,
      action: "regenerateQrCode",
      resourceType: "tenant",
      resourceId: args.tenantId.toString(),
      details: `QR code regenerated. Old slug invalidated.`,
      createdAt: now,
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
    if (!tenant) {
      throw new ConvexError("Tenant not found")
    }

    // Verify the tenant belongs to the user's organization
    if (tenant.orgId !== orgId) {
      throw new ConvexError("Access denied")
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
