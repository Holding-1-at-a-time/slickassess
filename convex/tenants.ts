import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { nanoid } from "nanoid"
import { ConvexError } from "convex/values"
import QRCode from "qrcode"

// Get tenant by organization ID
export const getByOrgId = query({
  args: { orgId: v.string() },
  handler: async (ctx, { orgId }) => {
    return await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .first()
  },
})

// Get tenant by QR slug (for public access)
export const getByQrSlug = query({
  args: { qrSlug: v.string() },
  handler: async (ctx, { qrSlug }) => {
    return await ctx.db
      .query("tenants")
      .withIndex("by_qrSlug", (q) => q.eq("qrSlug", qrSlug))
      .first()
  },
})

// Create a new tenant
export const createTenant = mutation({
  args: {
    name: v.string(),
    orgId: v.string(),
    branding: v.optional(
      v.object({
        logo: v.optional(v.string()),
        primaryColor: v.optional(v.string()),
        secondaryColor: v.optional(v.string()),
      }),
    ),
  },
  handler: async (ctx, { name, orgId, branding }) => {
    // Check if tenant already exists for this org
    const existingTenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
      .first()

    if (existingTenant) {
      throw new ConvexError("Tenant already exists for this organization")
    }

    // Generate a unique QR slug
    const qrSlug = nanoid(10)

    // Generate the public URL
    const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/scan/${qrSlug}`

    // Generate QR code
    const dataUrl = await QRCode.toDataURL(publicUrl, { width: 512 })

    // Create the tenant
    const tenantId = await ctx.db.insert("tenants", {
      name,
      orgId,
      qrSlug,
      qrCodeUrl: dataUrl,
      branding,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })

    return { tenantId, qrSlug, qrCodeUrl: dataUrl }
  },
})

// Regenerate QR code
export const regenerateQrCode = mutation({
  args: { tenantId: v.id("tenants") },
  handler: async (ctx, { tenantId }) => {
    const tenant = await ctx.db.get(tenantId)

    if (!tenant) {
      throw new ConvexError("Tenant not found")
    }

    // Generate a new unique QR slug
    const qrSlug = nanoid(10)

    // Generate the public URL
    const publicUrl = `${process.env.NEXT_PUBLIC_APP_URL}/scan/${qrSlug}`

    // Generate QR code
    const dataUrl = await QRCode.toDataURL(publicUrl, { width: 512 })

    // Update the tenant
    await ctx.db.patch(tenantId, {
      qrSlug,
      qrCodeUrl: dataUrl,
      updatedAt: Date.now(),
    })

    return { qrSlug, qrCodeUrl: dataUrl }
  },
})
