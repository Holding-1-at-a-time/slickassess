/**
    * @description      : 
    * @author           : rrome
    * @group            : 
    * @created          : 22/05/2025 - 22:32:30
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 22/05/2025
    * - Author          : rrome
    * - Modification    : 
**/
import { metadata } from "@/app/layout"
import { Organization } from "@clerk/nextjs/server"
import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  // Users table (for additional user data beyond what Clerk provides)
  users: defineTable({
    orgId: v.id("organizations"),
    image: v.string(),
    clerkId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    preferences: v.optional(v.object({})),
    // No orgId here because users can belong to multiple organizations
  })
    .index("by_clerkId", ["clerkId"])
    .index("by_email", ["email"]),

  // Clients table
  clients: defineTable({
    name: v.string(),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    zipCode: v.optional(v.string()),
    notes: v.optional(v.string()),
    status: v.string(), // "active", "inactive"
    orgId: v.string(), // Clerk organization ID - CRITICAL for data isolation
    clerkId: v.string(), // Clerk user ID who created this
    createdAt: v.number(), // Timestamp
    updatedAt: v.number(), // Timestamp
  })
    .index("by_orgId", ["orgId"]) // Primary index for data isolation
    .index("by_orgId_and_name", ["orgId", "name"]) // For searching by name within org
    .index("by_orgId_and_email", ["orgId", "email"]), // Unique index to prevent duplicates

  // Vehicles table
  vehicles: defineTable({
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
    mainImageId: v.optional(v.id("vehicleImages")),
    lastAssessmentId: v.optional(v.id("assessments")),
    lastAssessmentAt: v.optional(v.number()),
    orgId: v.string(), // Clerk organization ID - CRITICAL for data isolation
    clerkId: v.string(), // Clerk user ID who created this
    createdAt: v.number(), // Timestamp
    updatedAt: v.number(), // Timestamp
  })
    .index("by_orgId", ["orgId"]) // Primary index for data isolation
    .index("by_clientId", ["clientId"]) // For filtering by client
    .index("by_orgId_and_make", ["orgId", "make"]), // For searching by make within org

  // Vehicle Images table
  vehicleImages: defineTable({
    vehicleId: v.id("vehicles"),
    assessmentId: v.id("assessments"),
    url: v.string(),
    category: v.string(), // "exterior", "interior", "damage", etc.
    position: v.optional(v.string()), // "front", "rear", "side", etc.
    tags: v.optional(v.array(v.string())),
    isPrimary: v.boolean(),
    createdBy: v.string(),
    orgId: v.string(), // Clerk organization ID - CRITICAL for data isolation
    clerkId: v.string(), // Clerk user ID who created this
    createdAt: v.number(), // Timestamp
  })
    .index("by_orgId", ["orgId"]) // Primary index for data isolation
    .index("by_vehicleId", ["vehicleId"]), // For filtering by vehicle

  // Assessments table
  assessments: defineTable({
    vehicleId: v.id("vehicles"),
    title: v.string(),
    description: v.optional(v.string()),
    status: v.string(), // "pending", "in_progress", "completed", etc.
    assignedTo: v.optional(v.string()), // Clerk user ID
    dueDate: v.optional(v.number()), // Timestamp
    completedAt: v.optional(v.number()), // Timestamp
    findings: v.optional(v.array(v.object({}))),
    recommendations: v.optional(v.array(v.string())),
    orgId: v.string(), // Clerk organization ID - CRITICAL for data isolation
    clerkId: v.string(), // Clerk user ID who created this
    createdAt: v.number(), // Timestamp
    updatedAt: v.number(), // Timestamp
    // New fields for assessment structure
    assessmentNumber: v.optional(v.string()),
    clientId: v.optional(v.id("clients")),
    assessmentDate: v.optional(v.number()),
    mileage: v.optional(v.number()),
    notes: v.optional(v.string()),
    sections: v.optional(
      v.array(
        v.object({
          id: v.string(),
          name: v.string(),
          condition: v.union(v.string(), v.null()),
          notes: v.union(v.string(), v.null()),
          imageIds: v.array(v.string()),
        }),
      ),
    ),
    identifiedIssues: v.optional(
      v.array(
        v.object({
          section: v.string(),
          severity: v.string(),
          description: v.string(),
          imageIds: v.optional(v.array(v.string())),
          aiDetected: v.optional(v.boolean()),
        }),
      ),
    ),
    recommendedServices: v.optional(
      v.array(
        v.object({
          name: v.string(),
          description: v.string(),
          priority: v.string(),
        }),
      ),
    ),
    overallCondition: v.optional(v.string()),
    aiSummary: v.optional(v.string()),
    createdBy: v.optional(v.string()),
  })
    .index("by_orgId", ["orgId"]) // Primary index for data isolation
    .index("by_vehicleId", ["vehicleId"]) // For filtering by vehicle
    .index("by_assignedTo", ["assignedTo"]) // For filtering by assignee
    .index("by_orgId_and_status", ["orgId", "status"]), // For filtering by status within org

  // Lead Assessments table (from QR code submissions)
  leadAssessments: defineTable({
    tenantId: v.id("tenants"), // Tenant/organization ID
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
    imageIds: v.array(v.string()),
    convertedToAssessment: v.optional(v.id("assessments")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_tenantId_and_convertedToAssessment", ["tenantId", "convertedToAssessment"]),

  // Audit logs table
  auditLogs: defineTable({
    orgId: v.string(),
    clerkId: v.string(),
    action: v.string(), // "createVehicle", "updateClient", etc.
    resourceType: v.string(), // "vehicle", "client", "assessment", etc.
    resourceId: v.string(), // ID of the resource
    details: v.optional(v.string()), // Additional details
    createdAt: v.number(), // Timestamp
  })
    .index("by_orgId", ["orgId"])
    .index("by_resourceType_and_resourceId", ["resourceType", "resourceId"])
    .index("by_orgId_and_createdAt", ["orgId", "createdAt"]),

  // Image annotations table
  imageAnnotations: defineTable({
    imageId: v.id("vehicleImages"),
    vehicleId: v.id("vehicles"),
    assessmentId: v.optional(v.id("assessments")),
    annotations: v.array(
      v.object({
        id: v.string(),
        type: v.string(), // "pin", "rectangle", "circle", "arrow", "text"
        x: v.number(),
        y: v.number(),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        radius: v.optional(v.number()),
        color: v.string(),
        text: v.optional(v.string()),
        severity: v.optional(v.string()), // "minor", "moderate", "severe"
        category: v.optional(v.string()), // "scratch", "dent", "rust", etc.
        confidence: v.optional(v.number()), // AI confidence score
      }),
    ),
    orgId: v.string(), // For multi-tenant isolation
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_imageId", ["imageId"])
    .index("by_vehicleId", ["vehicleId"])
    .index("by_assessmentId", ["assessmentId"])
    .index("by_orgId", ["orgId"]),

  // Reports table
  reports: defineTable({
    assessmentId: v.id("assessments"),
    vehicleId: v.id("vehicles"),
    clientId: v.id("clients"),
    reportUrl: v.string(), // URL to the generated report
    reportType: v.string(), // "damage", "assessment", etc.
    orgId: v.string(), // For multi-tenant isolation
    clerkId: v.string(), // User who generated the report
    createdAt: v.number(),
  })
    .index("by_assessmentId", ["assessmentId"])
    .index("by_vehicleId", ["vehicleId"])
    .index("by_clientId", ["clientId"])
    .index("by_orgId", ["orgId"])
    .index("by_orgId_and_createdAt", ["orgId", "createdAt"]),

  // AI Feedback table for training
  aiFeedback: defineTable({
    imageId: v.id("vehicleImages"),
    assessmentId: v.optional(v.id("assessments")),
    originalPredictions: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        confidence: v.number(),
        boundingBox: v.object({
          x: v.number(),
          y: v.number(),
          width: v.number(),
          height: v.number(),
        }),
        category: v.string(),
        severity: v.string(),
      }),
    ),
    correctedAnnotations: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        x: v.number(),
        y: v.number(),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        radius: v.optional(v.number()),
        category: v.string(),
        severity: v.string(),
      }),
    ),
    feedbackType: v.string(), // "correction", "confirmation", "rejection"
    feedbackNotes: v.optional(v.string()),
    orgId: v.string(), // For multi-tenant isolation
    clerkId: v.string(), // User who provided the feedback
    createdAt: v.number(),
  })
    .index("by_imageId", ["imageId"])
    .index("by_assessmentId", ["assessmentId"])
    .index("by_orgId", ["orgId"])
    .index("by_createdAt", ["createdAt"]),

  // AI Model Versions table
  aiModelVersions: defineTable({
    modelName: v.string(), // "damage-detection", "severity-estimation", etc.
    version: v.string(), // Semantic versioning
    trainingDataCount: v.number(), // Number of samples used for training
    accuracy: v.number(), // Model accuracy metrics
    isActive: v.boolean(), // Whether this is the currently active model
    deployedAt: v.optional(v.number()), // When the model was deployed
    createdAt: v.number(),
  })
    .index("by_modelName_and_version", ["modelName", "version"])
    .index("by_modelName_and_isActive", ["modelName", "isActive"]),

  // User Client Preferences table
  userClientPreferences: defineTable({
    clientId: v.string(),
    orgId: v.string(), // For multi-tenant isolation
    preferredDays: v.array(v.string()),
    preferredTimeOfDay: v.string(), // "morning", "afternoon", "evening"
    preferredStaffId: v.string(),
    communicationPreference: v.string(), // "email", "sms", "none"
    reminderTiming: v.number(), // Hours before appointment
    createdAt: v.number(),
    createdBy: v.string(),
    updatedAt: v.number(),
    updatedBy: v.string(),
  })
    .index("by_clientId_orgId", ["clientId", "orgId"])
    .index("by_orgId", ["orgId"]),

  // Notification Templates table
  notificationTemplates: defineTable({
    orgId: v.string(),
    type: v.string(), // "appointmentReminder", "appointmentConfirmation", etc.
    channel: v.string(), // "email", "sms"
    subject: v.string(),
    body: v.string(),
    active: v.boolean(),
    createdAt: v.number(),
    createdBy: v.string(),
    updatedAt: v.number(),
    updatedBy: v.string(),
  })
    .index("by_orgId_type_channel", ["orgId", "type", "channel"])
    .index("by_orgId", ["orgId"]),

  // Calendar Integrations table
  calendarIntegrations: defineTable({
    userId: v.id("users"),
    orgId: v.string(), // For multi-tenant isolation
    provider: v.string(), // "google", "outlook", etc.
    accessToken: v.string(),
    refreshToken: v.string(),
    tokenExpiry: v.number(),
    calendarId: v.string(),
    syncEnabled: v.boolean(),
    lastSynced: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_and_provider", ["userId", "provider"])
    .index("by_orgId", ["orgId"]),

  // Calendar Events table
  calendarEvents: defineTable({
    integrationId: v.id("calendarIntegrations"),
    externalId: v.string(), // ID from the external calendar provider
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    location: v.optional(v.string()),
    attendees: v.optional(v.array(v.string())),
    assessmentId: v.optional(v.id("assessments")),
    vehicleId: v.optional(v.id("vehicles")),
    clientId: v.optional(v.id("clients")),
    reminders: v.optional(
      v.array(
        v.object({
          id: v.string(),
          method: v.string(), // "email", "popup", "sms"
          minutes: v.number(), // Minutes before the event
          sent: v.optional(v.boolean()),
          sentAt: v.optional(v.number()),
        }),
      ),
    ),
    defaultRemindersEnabled: v.optional(v.boolean()),
    orgId: v.string(), // For multi-tenant isolation
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_integrationId", ["integrationId"])
    .index("by_externalId", ["externalId"])
    .index("by_orgId", ["orgId"])
    .index("by_startTime", ["startTime"])
    .index("by_assessmentId", ["assessmentId"])
    .index("by_vehicleId", ["vehicleId"])
    .index("by_clientId", ["clientId"]),

  // Event Reminders table (for tracking reminder status)
  eventReminders: defineTable({
    eventId: v.id("calendarEvents"),
    reminderId: v.string(), // Matches the id in the reminders array
    method: v.string(), // "email", "popup", "sms"
    minutes: v.number(),
    scheduledTime: v.number(), // When the reminder should be sent
    sent: v.boolean(),
    sentAt: v.optional(v.number()),
    recipientEmail: v.optional(v.string()),
    recipientPhone: v.optional(v.string()),
    orgId: v.string(), // For multi-tenant isolation
    createdAt: v.number(),
  })
    .index("by_eventId", ["eventId"])
    .index("by_scheduledTime", ["scheduledTime"])
    .index("by_sent_scheduledTime", ["sent", "scheduledTime"])
    .index("by_orgId", ["orgId"]),

  // User Reminder Preferences table
  userReminderPreferences: defineTable({
    userId: v.id("users"),
    orgId: v.string(),
    defaultReminders: v.array(
      v.object({
        method: v.string(), // "email", "popup", "sms"
        minutes: v.number(),
      }),
    ),
    emailEnabled: v.boolean(),
    smsEnabled: v.boolean(),
    popupEnabled: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_orgId", ["orgId"]),

  // Notifications table (for in-app notifications)
  notifications: defineTable({
    userId: v.id("users"),
    orgId: v.string(),
    type: v.string(), // "reminder", "mention", "assignment", etc.
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()), // Optional link to navigate to
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_and_read", ["userId", "read"])
    .index("by_orgId", ["orgId"]),

  // Billing tables
  billingCustomers: defineTable({
    orgId: v.string(),
    stripeCustomerId: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_stripeCustomerId", ["stripeCustomerId"]),

  subscriptions: defineTable({
    orgId: v.string(),
    stripeSubscriptionId: v.string(),
    status: v.string(), // 'active', 'canceled', 'past_due', etc.
    planId: v.string(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_stripeSubscriptionId", ["stripeSubscriptionId"]),

  invoices: defineTable({
    orgId: v.string(),
    stripeInvoiceId: v.string(),
    stripeCustomerId: v.string(),
    amount: v.number(),
    status: v.string(), // 'paid', 'open', 'void', etc.
    invoiceUrl: v.optional(v.string()),
    invoicePdf: v.optional(v.string()),
    createdAt: v.number(),
    paidAt: v.optional(v.number()),
  })
    .index("by_orgId", ["orgId"])
    .index("by_stripeInvoiceId", ["stripeInvoiceId"])
    .index("by_orgId_createdAt", ["orgId", "createdAt"]),

  // Analytics events table
  analyticsEvents: defineTable({
    orgId: v.string(),
    eventType: v.string(), // 'appointment_created', 'assessment_completed', etc.
    eventData: v.object({}), // Flexible schema for different event types
    userId: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index("by_orgId_eventType", ["orgId", "eventType"])
    .index("by_orgId_timestamp", ["orgId", "timestamp"]),

  // Tenants table
  tenants: defineTable({
    name: v.string(),
    orgId: v.string(), // Clerk organization ID
    qrSlugs: v.array(
      v.object({
        slug: v.string(),
        active: v.boolean(),
        createdAt: v.number(),
      }),
    ),
    activeQrSlug: v.string(), // Current active QR slug
    qrCodeUrl: v.optional(v.string()), // Data URL of the QR code
    branding: v.optional(
      v.object({
        logo: v.optional(v.string()),
        primaryColor: v.optional(v.string()),
        secondaryColor: v.optional(v.string()),
      }),
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_activeQrSlug", ["activeQrSlug"]),

  // QR Code slugs table
  qrSlugs: defineTable({
    slug: v.string(),
    active: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_slug", ["slug"])
    .index("by_active", ["active"]),

  Organization: defineTable({
    id: v.string(),
    name: v.string(),
    role: v.string(),
    slug: v.string(),
    image: v.optional(v.string()),
    metadata: v.optional(v.object({})),
    permisions: v.object({}),
  })
    .index("by_id", ["id"])
    .index("by_slug", ["slug"])
    .index("by_name", ["name"])
    .index("by_role", ["role"])
    .index("by_image", ["image"])
    .index("by_metadata", ["metadata"])
    .index("by_permisions", ["permisions"]),

// Rate limiting table
  rateLimits: defineTable({
    identifier: v.string(), // IP address or other identifier
    action: v.string(), // The action being rate limited (e.g., "publicAssessment", "imageUpload")
    count: v.number(), // Number of requests in the current window
    windowStart: v.number(), // Start timestamp of the current window
    expiresAt: v.number(), // When this record should be cleaned up
  })
    .index("by_identifier_and_action", ["identifier", "action"])
    .index("by_expiresAt", ["expiresAt"]) // For cleanup
    .index("by_windowStart", ["windowStart"]); // For cleanup
});