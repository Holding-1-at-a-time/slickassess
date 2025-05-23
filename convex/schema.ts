import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  // Users table
  users: defineTable({
    name: v.string(),
    email: v.string(),
    clerkId: v.string(),
    orgIds: v.array(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastLoginAt: v.optional(v.number()),
    preferences: v.optional(
      v.object({
        theme: v.optional(v.string()),
        notifications: v.optional(v.boolean()),
        emailFrequency: v.optional(v.string()),
      }),
    ),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_org_ids", ["orgIds"])
    .index("by_created_at", ["createdAt"])
    .index("by_last_login", ["lastLoginAt"]),

  // Organizations table
  organizations: defineTable({
    name: v.string(),
    clerkId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    settings: v.optional(
      v.object({
        theme: v.optional(v.string()),
        logo: v.optional(v.string()),
        contactEmail: v.optional(v.string()),
        contactPhone: v.optional(v.string()),
        address: v.optional(v.string()),
      }),
    ),
    subscription: v.optional(
      v.object({
        status: v.string(),
        plan: v.string(),
        trialEndsAt: v.optional(v.number()),
        canceledAt: v.optional(v.number()),
      }),
    ),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_created_at", ["createdAt"])
    .index("by_subscription_status", ["subscription.status"])
    .index("by_trial_ends_at", ["subscription.trialEndsAt"]),

  // Clients table
  clients: defineTable({
    name: v.string(),
    email: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    orgId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.string(),
    status: v.optional(v.string()),
    notes: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    lastContactedAt: v.optional(v.number()),
  })
    .index("by_org_id", ["orgId"])
    .index("by_email", ["email"])
    .index("by_org_and_status", ["orgId", "status"])
    .index("by_created_at", ["createdAt"])
    .index("by_org_and_created_at", ["orgId", "createdAt"])
    .index("by_last_contacted", ["lastContactedAt"])
    .index("by_org_and_last_contacted", ["orgId", "lastContactedAt"])
    .index("by_created_by", ["createdBy"]),

  // Vehicles table
  vehicles: defineTable({
    make: v.string(),
    model: v.string(),
    year: v.number(),
    vin: v.optional(v.string()),
    color: v.optional(v.string()),
    licensePlate: v.optional(v.string()),
    clientId: v.string(),
    orgId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.string(),
    status: v.optional(v.string()),
    mileage: v.optional(v.number()),
    bodyType: v.optional(v.string()),
    size: v.optional(v.string()),
  })
    .index("by_org_id", ["orgId"])
    .index("by_client_id", ["clientId"])
    .index("by_vin", ["vin"])
    .index("by_license_plate", ["licensePlate"])
    .index("by_org_and_created_at", ["orgId", "createdAt"])
    .index("by_make_model_year", ["make", "model", "year"])
    .index("by_org_and_make", ["orgId", "make"])
    .index("by_org_and_status", ["orgId", "status"])
    .index("by_created_by", ["createdBy"]),

  // Assessments table
  assessments: defineTable({
    vehicleId: v.string(),
    clientId: v.string(),
    orgId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.string(),
    status: v.string(),
    type: v.string(),
    notes: v.optional(v.string()),
    totalPrice: v.optional(v.number()),
    estimatedDuration: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    approvedAt: v.optional(v.number()),
    approvedBy: v.optional(v.string()),
    reportId: v.optional(v.string()),
    aiNotes: v.optional(v.string()),
  })
    .index("by_org_id", ["orgId"])
    .index("by_vehicle_id", ["vehicleId"])
    .index("by_client_id", ["clientId"])
    .index("by_status", ["status"])
    .index("by_type", ["type"])
    .index("by_org_and_status", ["orgId", "status"])
    .index("by_org_and_created_at", ["orgId", "createdAt"])
    .index("by_org_and_type", ["orgId", "type"])
    .index("by_completed_at", ["completedAt"])
    .index("by_org_and_completed_at", ["orgId", "completedAt"])
    .index("by_approved_at", ["approvedAt"])
    .index("by_report_id", ["reportId"])
    .index("by_created_by", ["createdBy"]),

  // Images table
  images: defineTable({
    url: v.string(),
    storageId: v.string(),
    filename: v.string(),
    contentType: v.string(),
    size: v.number(),
    vehicleId: v.optional(v.string()),
    assessmentId: v.optional(v.string()),
    orgId: v.string(),
    createdAt: v.number(),
    createdBy: v.string(),
    type: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_org_id", ["orgId"])
    .index("by_vehicle_id", ["vehicleId"])
    .index("by_assessment_id", ["assessmentId"])
    .index("by_storage_id", ["storageId"])
    .index("by_type", ["type"])
    .index("by_org_and_type", ["orgId", "type"])
    .index("by_org_and_created_at", ["orgId", "createdAt"])
    .index("by_created_by", ["createdBy"]),

  // Digital Signatures table
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
    orgId: v.string(),
  })
    .index("by_reportId", ["reportId"])
    .index("by_status", ["status"])
    .index("by_created", ["createdAt"])
    .index("by_org", ["orgId"])
    .index("by_org_and_createdAt", ["orgId", "createdAt"])
    .index("by_org_and_status", ["orgId", "status"])
    .index("by_customer_email", ["customerInfo.email"]),

  // Rate Limits table
  rateLimits: defineTable({
    identifier: v.string(),
    action: v.string(),
    tokens: v.number(),
    lastRefill: v.number(),
    windowStart: v.number(),
    expiresAt: v.number(),
  })
    .index("by_identifier_and_action", ["identifier", "action"])
    .index("by_expiresAt", ["expiresAt"])
    .index("by_windowStart", ["windowStart"]),

  // Appointments table
  appointments: defineTable({
    clientId: v.string(),
    vehicleId: v.optional(v.string()),
    orgId: v.string(),
    appointmentDate: v.number(),
    duration: v.number(),
    status: v.string(),
    serviceType: v.string(),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    createdBy: v.string(),
    updatedAt: v.number(),
    reminderSent: v.boolean(),
    reminderSentAt: v.optional(v.number()),
    calendarEventId: v.optional(v.string()),
  })
    .index("by_org_id", ["orgId"])
    .index("by_client_id", ["clientId"])
    .index("by_vehicle_id", ["vehicleId"])
    .index("by_appointment_date", ["appointmentDate"])
    .index("by_status", ["status"])
    .index("by_org_and_date", ["orgId", "appointmentDate"])
    .index("by_reminder_sent", ["reminderSent"]),

  // Leads table
  leads: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    source: v.optional(v.string()),
    status: v.string(),
    orgId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    notes: v.optional(v.string()),
    assignedTo: v.optional(v.string()),
    lastContactedAt: v.optional(v.number()),
    convertedToClientAt: v.optional(v.number()),
    convertedToClientId: v.optional(v.string()),
  })
    .index("by_org_id", ["orgId"])
    .index("by_email", ["email"])
    .index("by_status", ["status"])
    .index("by_assigned_to", ["assignedTo"])
    .index("by_org_and_status", ["orgId", "status"])
    .index("by_org_and_created_at", ["orgId", "createdAt"]),
})
