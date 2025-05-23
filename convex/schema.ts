import { defineSchema, defineTable, v } from "convex/server"

export default defineSchema({
  digitalSignatures: defineTable({
    reportId: v.string(),
    approvalData: v.any(),
    customerInfo: v.object({
      name: v.string(),
      email: v.string(),
      phone: v.string(),
    }),
    businessInfo: v.optional(
      v.object({
        name: v.string(),
        address: v.string(),
        phone: v.string(),
        email: v.string(),
      }),
    ),
    status: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    orgId: v.string(), // Add this field for better indexing
  })
    .index("by_reportId", ["reportId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_org", ["orgId"]) // Add this new index
    .index("by_org_and_createdAt", ["orgId", "createdAt"]), // Add compound index for analytics
  assessments: defineTable({
    aiNotes: v.optional(v.string()), // Add dedicated field for AI-generated notes
  }),
  rateLimits: defineTable({})
    .index("by_identifier_and_action", ["identifier", "action"])
    .index("by_expiresAt", ["expiresAt"])
    .index("by_windowStart", ["windowStart"]), // Add for cleanup queries
})
