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
    .index("by_org_ids", ["orgIds"]),

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
  }).index("by_clerk_id", ["clerkId"]),

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
    .index("by_org_and_created_at", ["orgId", "createdAt"]),

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
    .index("by_org_and_created_at", ["orgId", "createdAt"])
    .index("by_make_model_year", ["make", "model", "year"]),

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
  })
    .index("by_org_id", ["orgId"])
    .index("by_vehicle_id", ["vehicleId"])
    .index("by_client_id", ["clientId"])
    .index("by_status", ["status"])
    .index("by_org_and_status", ["orgId", "status"])
    .index("by_org_and_created_at", ["orgId", "createdAt"])
    .index("by_org_and_type", ["orgId", "type"]),

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
    .index("by_type", ["type"]),

  // Annotations table
  annotations: defineTable({
    imageId: v.string(),
    vehicleId: v.string(),
    assessmentId: v.optional(v.string()),
    orgId: v.string(),
    createdAt: v.number(),
    createdBy: v.string(),
    annotations: v.array(v.any()),
    analysisType: v.optional(v.string()),
  })
    .index("by_image_id", ["imageId"])
    .index("by_vehicle_id", ["vehicleId"])
    .index("by_assessment_id", ["assessmentId"])
    .index("by_org_id", ["orgId"]),

  // Reports table
  reports: defineTable({
    assessmentId: v.string(),
    vehicleId: v.string(),
    clientId: v.string(),
    orgId: v.string(),
    createdAt: v.number(),
    createdBy: v.string(),
    reportNumber: v.string(),
    status: v.string(),
    data: v.any(),
    sharedUrl: v.optional(v.string()),
    sharedToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    signatureId: v.optional(v.string()),
    signedAt: v.optional(v.number()),
    signedBy: v.optional(v.string()),
  })
    .index("by_assessment_id", ["assessmentId"])
    .index("by_vehicle_id", ["vehicleId"])
    .index("by_client_id", ["clientId"])
    .index("by_org_id", ["orgId"])
    .index("by_report_number", ["reportNumber"])
    .index("by_shared_token", ["sharedToken"])
    .index("by_status", ["status"])
    .index("by_org_and_created_at", ["orgId", "createdAt"]),

  // Signatures table
  signatures: defineTable({
    reportId: v.string(),
    clientId: v.string(),
    orgId: v.string(),
    createdAt: v.number(),
    signatureData: v.string(),
    signedBy: v.string(),
    signedAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    verificationToken: v.string(),
    verified: v.boolean(),
    verifiedAt: v.optional(v.number()),
  })
    .index("by_report_id", ["reportId"])
    .index("by_client_id", ["clientId"])
    .index("by_org_id", ["orgId"])
    .index("by_verification_token", ["verificationToken"]),

  // Calendar Events table
  calendarEvents: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    location: v.optional(v.string()),
    orgId: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    clientId: v.optional(v.string()),
    vehicleId: v.optional(v.string()),
    assessmentId: v.optional(v.string()),
    externalId: v.optional(v.string()),
    integrationId: v.optional(v.string()),
    attendees: v.optional(v.array(v.string())),
    status: v.optional(v.string()),
    reminders: v.optional(
      v.array(
        v.object({
          time: v.number(),
          method: v.string(),
          sent: v.boolean(),
          sentAt: v.optional(v.number()),
        }),
      ),
    ),
  })
    .index("by_org_id", ["orgId"])
    .index("by_client_id", ["clientId"])
    .index("by_vehicle_id", ["vehicleId"])
    .index("by_assessment_id", ["assessmentId"])
    .index("by_external_id", ["externalId"])
    .index("by_integration_id", ["integrationId"])
    .index("by_start_time", ["startTime"])
    .index("by_org_and_start_time", ["orgId", "startTime"])
    .index("by_org_and_status", ["orgId", "status"]),

  // Calendar Integrations table
  calendarIntegrations: defineTable({
    userId: v.string(),
    orgId: v.string(),
    provider: v.string(),
    accessToken: v.string(),
    refreshToken: v.string(),
    tokenExpiry: v.number(),
    calendarId: v.string(),
    syncEnabled: v.boolean(),
    lastSynced: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_org_id", ["orgId"])
    .index("by_provider", ["provider"])
    .index("by_sync_enabled", ["syncEnabled"]),

  // Notifications table
  notifications: defineTable({
    userId: v.string(),
    orgId: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number(),
    readAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    priority: v.optional(v.string()),
    metadata: v.optional(v.any()),
  })
    .index("by_user_id", ["userId"])
    .index("by_org_id", ["orgId"])
    .index("by_read", ["read"])
    .index("by_user_and_read", ["userId", "read"])
    .index("by_created_at", ["createdAt"])
    .index("by_user_and_created_at", ["userId", "createdAt"]),

  // Notification Templates table
  notificationTemplates: defineTable({
    orgId: v.string(),
    type: v.string(),
    channel: v.string(),
    subject: v.string(),
    body: v.string(),
    active: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.string(),
    variables: v.optional(v.array(v.string())),
  })
    .index("by_org_id", ["orgId"])
    .index("by_type", ["type"])
    .index("by_channel", ["channel"])
    .index("by_org_type_channel", ["orgId", "type", "channel"]),

  // User Client Preferences table
  userClientPreferences: defineTable({
    userId: v.string(),
    clientId: v.string(),
    orgId: v.string(),
    communicationPreference: v.string(),
    reminderTiming: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_client_id", ["clientId"])
    .index("by_org_id", ["orgId"]),

  // AI Training Data table
  aiTrainingData: defineTable({
    orgId: v.string(),
    type: v.string(),
    data: v.any(),
    labels: v.optional(v.any()),
    createdAt: v.number(),
    createdBy: v.string(),
    status: v.string(),
    feedback: v.optional(
      v.object({
        rating: v.number(),
        comments: v.optional(v.string()),
        submittedAt: v.number(),
        submittedBy: v.string(),
      }),
    ),
    metadata: v.optional(v.any()),
  })
    .index("by_org_id", ["orgId"])
    .index("by_type", ["type"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),

  // Rate Limiting table
  rateLimits: defineTable({
    identifier: v.string(),
    action: v.string(),
    tokens: v.number(),
    lastRefill: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_identifier_action", ["identifier", "action"])
    .index("by_identifier", ["identifier"])
    .index("by_action", ["action"]),

  // Billing table
  billing: defineTable({
    orgId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.optional(v.string()),
    plan: v.optional(v.string()),
    status: v.optional(v.string()),
    currentPeriodStart: v.optional(v.number()),
    currentPeriodEnd: v.optional(v.number()),
    cancelAtPeriodEnd: v.optional(v.boolean()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_org_id", ["orgId"])
    .index("by_stripe_customer_id", ["stripeCustomerId"])
    .index("by_stripe_subscription_id", ["stripeSubscriptionId"]),

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
