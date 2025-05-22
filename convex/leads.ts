import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { ConvexError } from "convex/values"
import { requireAuth } from "./utils/auth"
import type { Id } from "./_generated/dataModel"
import { randomUUID } from "crypto"

// Helper function to generate assessment number
async function generateAssessmentNumber(ctx: any, orgId: string) {
  const existing = await ctx.db
    .query("assessments")
    .withIndex("by_orgId", (q) => q.eq("orgId", orgId))
    .order("desc")
    .take(1)
    .collect()

  let nextNumber = 1
  if (existing.length > 0) {
    const last = existing[0].assessmentNumber
    if (last) {
      const match = last.match(/\d+$/)
      if (match) nextNumber = Number.parseInt(match[0], 10) + 1
    }
  }

  return `ASS-${String(nextNumber).padStart(5, "0")}`
}

// List leads by tenant
export const listByTenant = query({
  args: {
    tenantId: v.string(),
  },
  handler: async (ctx, args) => {
    const { tenantId } = args

    // Verify tenant exists
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", tenantId))
      .first()

    if (!tenant) {
      throw new ConvexError("Tenant not found")
    }

    // Get unconverted leads for this tenant
    const leads = await ctx.db
      .query("leadAssessments")
      .withIndex("by_tenantId_and_convertedToAssessment", (q) =>
        q.eq("tenantId", tenantId).eq("convertedToAssessment", undefined),
      )
      .order("desc", (q) => q.field("createdAt"))
      .collect()

    return leads
  },
})

// Convert a lead to a full assessment
export const convertLeadToAssessment = mutation({
  args: {
    leadAssessmentId: v.id("leadAssessments"),
  },
  handler: async (ctx, args) => {
    const { leadAssessmentId } = args
    const { userId } = await requireAuth(ctx)
    const now = Date.now()

    // Get the lead
    const lead = await ctx.db.get(leadAssessmentId)
    if (!lead) {
      throw new ConvexError("Lead not found")
    }

    // Check if already converted
    if (lead.convertedToAssessment) {
      throw new ConvexError("Lead already converted to assessment")
    }

    // Create or get client
    let clientId: Id<"clients">
    try {
      // Try to find existing client by email
      const existingClient = await ctx.db
        .query("clients")
        .withIndex("by_orgId_and_email", (q) => q.eq("orgId", lead.tenantId).eq("email", lead.customerInfo.email))
        .first()

      if (existingClient) {
        clientId = existingClient._id
      } else {
        // Create new client
        clientId = await ctx.db.insert("clients", {
          name: lead.customerInfo.name,
          email: lead.customerInfo.email,
          phone: lead.customerInfo.phone,
          status: "active",
          orgId: lead.tenantId,
          clerkId: userId || "system",
          createdAt: now,
          updatedAt: now,
        })
      }
    } catch (error) {
      console.error("Error creating/finding client:", error)
      throw new ConvexError("Failed to create or find client")
    }

    // Create vehicle
    const vehicleId = await ctx.db.insert("vehicles", {
      clientId,
      vin: "", // Empty for lead conversions
      make: lead.vehicleInfo.make,
      model: lead.vehicleInfo.model,
      year: lead.vehicleInfo.year,
      color: lead.vehicleInfo.color,
      orgId: lead.tenantId,
      clerkId: userId || "system",
      createdAt: now,
      updatedAt: now,
    })

    // Generate assessment number
    const assessmentNumber = await generateAssessmentNumber(ctx, lead.tenantId)

    // Prepare identified issues based on lead data
    const identifiedIssues = []
    if (lead.hasScratches) {
      identifiedIssues.push({
        section: "Exterior",
        severity: "minor",
        description: "Client-reported scratches",
        imageIds: lead.imageIds,
        aiDetected: false,
      })
    }
    if (lead.hasDents) {
      identifiedIssues.push({
        section: "Exterior",
        severity: "moderate",
        description: "Client-reported dents",
        imageIds: lead.imageIds,
        aiDetected: false,
      })
    }

    // Create assessment
    const assessmentId = await ctx.db.insert("assessments", {
      vehicleId,
      clientId,
      title: `${lead.vehicleInfo.year} ${lead.vehicleInfo.make} ${lead.vehicleInfo.model} Assessment`,
      description: lead.description,
      status: "draft",
      orgId: lead.tenantId,
      clerkId: userId || "system",
      assessmentNumber,
      assessmentDate: now,
      mileage: null,
      notes: `Converted from self-assessment lead ${lead._id}`,
      sections: [
        {
          id: randomUUID(),
          name: "Exterior",
          condition: null,
          notes: null,
          imageIds: lead.imageIds,
        },
        {
          id: randomUUID(),
          name: "Interior",
          condition: null,
          notes: null,
          imageIds: [],
        },
        {
          id: randomUUID(),
          name: "Engine Bay",
          condition: null,
          notes: null,
          imageIds: [],
        },
        {
          id: randomUUID(),
          name: "Wheels & Tires",
          condition: null,
          notes: null,
          imageIds: [],
        },
      ],
      identifiedIssues,
      recommendedServices: lead.needsDetailing
        ? [
            {
              name: "Full Detailing Service",
              description: "Client requested detailing service",
              priority: "medium",
            },
          ]
        : [],
      createdAt: now,
      updatedAt: now,
      createdBy: userId || "system",
    })

    // Mark the lead as converted
    await ctx.db.patch(leadAssessmentId, {
      convertedToAssessment: assessmentId,
      updatedAt: now,
    })

    // Create notification for the conversion
    await ctx.db.insert("notifications", {
      userId: null, // Will be filled in by a background job that finds org admins
      orgId: lead.tenantId,
      type: "lead_converted",
      title: "Lead Converted to Assessment",
      message: `Lead for ${lead.customerInfo.name}'s ${lead.vehicleInfo.year} ${lead.vehicleInfo.make} ${lead.vehicleInfo.model} has been converted to a full assessment`,
      link: `/assessments/${assessmentId}`,
      read: false,
      createdAt: now,
    })

    // Log the action
    await ctx.db.insert("auditLogs", {
      orgId: lead.tenantId,
      clerkId: userId || "system",
      action: "convertLeadToAssessment",
      resourceType: "leadAssessment",
      resourceId: lead._id,
      details: JSON.stringify({ assessmentId }),
      createdAt: now,
    })

    return assessmentId
  },
})

// Create a lead assessment from public form
export const createLeadAssessment = mutation({
  args: {
    tenantId: v.string(),
    customerInfo: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.string(),
    }),
    vehicleInfo: v.object({
      make: v.string(),
      model: v.string(),
      year: v.number(),
      color: v.string(),
    }),
    description: v.string(),
    hasScratches: v.optional(v.boolean()),
    hasDents: v.optional(v.boolean()),
    needsDetailing: v.optional(v.boolean()),
    images: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { tenantId, customerInfo, vehicleInfo, description, hasScratches, hasDents, needsDetailing, images } = args
    const now = Date.now()

    // Verify tenant exists
    const tenant = await ctx.db
      .query("tenants")
      .withIndex("by_orgId", (q) => q.eq("orgId", tenantId))
      .first()

    if (!tenant) {
      throw new ConvexError("Tenant not found")
    }

    // Create lead assessment
    const leadId = await ctx.db.insert("leadAssessments", {
      tenantId,
      customerInfo,
      vehicleInfo,
      description,
      hasScratches: hasScratches || false,
      hasDents: hasDents || false,
      needsDetailing: needsDetailing || false,
      imageIds: images,
      createdAt: now,
      updatedAt: now,
    })

    // Create notification for new lead
    await ctx.db.insert("notifications", {
      userId: null, // Will be filled in by a background job that finds org admins
      orgId: tenantId,
      type: "new_lead",
      title: "New Lead Submitted",
      message: `A new lead has been submitted for ${customerInfo.name}'s ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}`,
      link: `/dashboard`, // Link to dashboard where leads are shown
      read: false,
      createdAt: now,
    })

    return { success: true, leadId }
  },
})
