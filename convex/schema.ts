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
    orgId: v.string(), // Add this field for indexing
  })
    .index("by_report", ["reportId"])
    .index("by_org", ["orgId"]) // Add this index
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"]),
})
