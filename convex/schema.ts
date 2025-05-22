import { defineSchema, defineTable } from "convex/server"
import { v } from "convex/values"

export default defineSchema({
  // Existing tables...
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    imageUrl: v.optional(v.string()),
    role: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerkId", ["clerkId"]),

  organizations: defineTable({
    clerkId: v.string(),
    name: v.string(),
    slug: v.string(),
    imageUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_clerkId", ["clerkId"]),

  tenants: defineTable({
    orgId: v.string(),
    name: v.string(),
    slug: v.string(),
    qrSlug: v.string(),
    description: v.optional(v.string()),
    settings: v.optional(v.object({})),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_qrSlug", ["qrSlug"]),

  clients: defineTable({
    orgId: v.string(),
    name: v.string(),
    email: v.string(),
    phone: v.string(),
    address: v.string(),
    city: v.string(),
    state: v.string(),
    zipCode: v.string(),
    notes: v.string(),
    status: v.string(),
    createdBy: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_orgId_and_email", ["orgId", "email"]),

  vehicles: defineTable({
    orgId: v.string(),
    clerkId: v.string(),
    clientId: v.id("clients"),
    vin: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    color: v.string(),
    licensePlate: v.string(),
    mileage: v.number(),
    exteriorCondition: v.string(),
    interiorCondition: v.string(),
    notes: v.string(),
    features: v.array(v.string()),
    mainImageId: v.union(v.id("vehicleImages"), v.null()),
    lastAssessmentId: v.union(v.id("assessments"), v.null()),
    lastAssessmentAt: v.union(v.number(), v.null()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_clientId", ["clientId"]),

  vehicleImages: defineTable({
    orgId: v.string(),
    clerkId: v.string(),
    vehicleId: v.id("vehicles"),
    url: v.string(),
    category: v.string(),
    isPrimary: v.boolean(),
    createdAt: v.number(),
  }).index("by_vehicleId", ["vehicleId"]),

  assessments: defineTable({
    orgId: v.string(),
    vehicleId: v.id("vehicles"),
    clientId: v.id("clients"),
    assessmentNumber: v.string(),
    status: v.string(),
    assessmentDate: v.number(),
    mileage: v.number(),
    notes: v.string(),
    sections: v.array(
      v.object({
        id: v.string(),
        name: v.string(),
        condition: v.union(v.string(), v.null()),
        notes: v.union(v.string(), v.null()),
        imageIds: v.array(v.string()),
      }),
    ),
    identifiedIssues: v.array(
      v.object({
        section: v.string(),
        severity: v.string(),
        description: v.string(),
        aiDetected: v.optional(v.boolean()),
      }),
    ),
    recommendedServices: v.array(
      v.object({
        name: v.string(),
        description: v.string(),
        priority: v.string(),
      }),
    ),
    overallCondition: v.string(),
    aiSummary: v.string(),
    completedAt: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_vehicleId", ["vehicleId"])
    .index("by_clientId", ["clientId"]),

  notifications: defineTable({
    userId: v.union(v.string(), v.null()),
    orgId: v.string(),
    type: v.string(),
    title: v.string(),
    message: v.string(),
    link: v.optional(v.string()),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_orgId", ["orgId"]),

  auditLogs: defineTable({
    orgId: v.string(),
    clerkId: v.optional(v.string()),
    userId: v.optional(v.string()),
    action: v.string(),
    resourceType: v.string(),
    resourceId: v.string(),
    details: v.optional(v.object({})),
    createdAt: v.number(),
  }).index("by_orgId", ["orgId"]),

  settings: defineTable({
    orgId: v.string(),
    theme: v.optional(v.string()),
    notificationPreferences: v.optional(v.object({})),
    customFields: v.optional(v.array(v.object({}))),
  }).index("by_orgId", ["orgId"]),

  calendarIntegrations: defineTable({
    orgId: v.string(),
    clerkId: v.string(),
    provider: v.string(),
    accessToken: v.string(),
    refreshToken: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    calendarId: v.optional(v.string()),
    syncEnabled: v.boolean(),
    lastSyncAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_clerkId", ["clerkId"]),

  calendarEvents: defineTable({
    orgId: v.string(),
    clerkId: v.string(),
    externalId: v.optional(v.string()),
    title: v.string(),
    description: v.optional(v.string()),
    startTime: v.number(),
    endTime: v.number(),
    location: v.optional(v.string()),
    attendees: v.array(v.string()),
    vehicleId: v.optional(v.id("vehicles")),
    clientId: v.optional(v.id("clients")),
    assessmentId: v.optional(v.id("assessments")),
    status: v.string(),
    reminderSent: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_clerkId", ["clerkId"])
    .index("by_startTime", ["startTime"]),

  eventReminders: defineTable({
    orgId: v.string(),
    eventId: v.id("calendarEvents"),
    reminderType: v.string(),
    reminderTime: v.number(),
    sent: v.boolean(),
    sentAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index("by_eventId", ["eventId"])
    .index("by_reminderTime", ["reminderTime"]),

  userReminderPreferences: defineTable({
    orgId: v.string(),
    clerkId: v.string(),
    emailReminders: v.boolean(),
    smsReminders: v.boolean(),
    reminderTimes: v.array(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_clerkId", ["clerkId"]),

  leads: defineTable({
    orgId: v.string(),
    source: v.string(),
    customerName: v.string(),
    customerEmail: v.string(),
    customerPhone: v.string(),
    vehicleInfo: v.object({
      make: v.string(),
      model: v.string(),
      year: v.number(),
      color: v.string(),
    }),
    serviceRequested: v.string(),
    description: v.string(),
    status: v.string(),
    priority: v.string(),
    assignedTo: v.optional(v.string()),
    followUpDate: v.optional(v.number()),
    convertedToClient: v.boolean(),
    clientId: v.optional(v.id("clients")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_status", ["status"])
    .index("by_assignedTo", ["assignedTo"]),

  reports: defineTable({
    orgId: v.string(),
    type: v.string(),
    title: v.string(),
    description: v.optional(v.string()),
    parameters: v.object({}),
    data: v.object({}),
    generatedBy: v.string(),
    generatedAt: v.number(),
    format: v.string(),
    fileUrl: v.optional(v.string()),
  }).index("by_orgId", ["orgId"]),

  annotations: defineTable({
    orgId: v.string(),
    imageId: v.id("vehicleImages"),
    vehicleId: v.id("vehicles"),
    assessmentId: v.optional(v.id("assessments")),
    annotations: v.array(
      v.object({
        id: v.string(),
        type: v.string(),
        x: v.number(),
        y: v.number(),
        width: v.optional(v.number()),
        height: v.optional(v.number()),
        radius: v.optional(v.number()),
        color: v.string(),
        text: v.string(),
        severity: v.optional(v.string()),
        category: v.optional(v.string()),
        location: v.optional(v.string()),
        repairComplexity: v.optional(v.string()),
        recommendation: v.optional(v.string()),
      }),
    ),
    analysisType: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_imageId", ["imageId"])
    .index("by_vehicleId", ["vehicleId"])
    .index("by_assessmentId", ["assessmentId"]),

  aiFeedback: defineTable({
    orgId: v.string(),
    clerkId: v.string(),
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
    feedbackType: v.string(),
    feedbackNotes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_orgId", ["orgId"]),

  aiAnalysisResults: defineTable({
    orgId: v.string(),
    imageId: v.id("vehicleImages"),
    vehicleId: v.id("vehicles"),
    assessmentId: v.optional(v.id("assessments")),
    analysisType: v.string(),
    results: v.any(),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_imageId", ["imageId"])
    .index("by_vehicleId", ["vehicleId"])
    .index("by_assessmentId", ["assessmentId"]),

  aiModelVersions: defineTable({
    modelName: v.string(),
    version: v.string(),
    trainingDataCount: v.number(),
    accuracy: v.number(),
    isActive: v.boolean(),
    deployedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_modelName_and_isActive", ["modelName", "isActive"]),

  // New pricing tables
  pricingConfigurations: defineTable({
    tenantId: v.id("tenants"),
    orgId: v.string(),
    basePrices: v.object({
      exteriorWash: v.number(),
      interiorCleaning: v.number(),
      waxing: v.number(),
      detailing: v.number(),
      paintCorrection: v.number(),
      ceramicCoating: v.number(),
      engineCleaning: v.number(),
      headlightRestoration: v.number(),
      scratchRepair: v.number(),
      dentRepair: v.number(),
    }),
    laborRate: v.number(),
    markupPercentage: v.number(),
    minimumCharge: v.number(),
    rushOrderMultiplier: v.number(),
    discountThresholds: v.object({
      volume: v.object({
        threshold: v.number(),
        discount: v.number(),
      }),
      loyalty: v.object({
        threshold: v.number(),
        discount: v.number(),
      }),
    }),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedBy: v.string(),
    updatedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_orgId", ["orgId"]),

  pricingEstimates: defineTable({
    tenantId: v.id("tenants"),
    vehicleId: v.id("vehicles"),
    assessmentId: v.optional(v.id("assessments")),
    clientId: v.optional(v.id("clients")),
    orgId: v.string(),
    requestedServices: v.array(v.string()),
    vehicleSize: v.string(),
    estimatedDuration: v.string(),
    filthiness: v.string(),
    damageSeverity: v.string(),
    isRushOrder: v.boolean(),
    serviceBreakdown: v.array(
      v.object({
        service: v.string(),
        basePrice: v.number(),
        adjustedPrice: v.number(),
        multipliers: v.object({
          vehicleSize: v.number(),
          damage: v.number(),
          filthiness: v.number(),
          duration: v.number(),
          serviceSpecific: v.number(),
          total: v.number(),
        }),
      }),
    ),
    baseTotal: v.number(),
    subtotal: v.number(),
    discountAmount: v.number(),
    discountType: v.string(),
    finalTotal: v.number(),
    estimatedHours: v.number(),
    laborCost: v.number(),
    status: v.string(), // draft, approved, rejected, converted
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_vehicleId", ["vehicleId"])
    .index("by_clientId", ["clientId"])
    .index("by_orgId", ["orgId"]),

  serviceOrders: defineTable({
    estimateId: v.id("pricingEstimates"),
    tenantId: v.id("tenants"),
    vehicleId: v.id("vehicles"),
    clientId: v.id("clients"),
    orgId: v.string(),
    orderNumber: v.string(),
    services: v.array(v.string()),
    totalAmount: v.number(),
    status: v.string(), // pending, in_progress, completed, cancelled
    scheduledDate: v.optional(v.number()),
    completedDate: v.optional(v.number()),
    assignedTechnicians: v.array(v.string()),
    notes: v.optional(v.string()),
    beforeImages: v.array(v.string()),
    afterImages: v.array(v.string()),
    customerSignature: v.optional(v.string()),
    paymentStatus: v.string(), // pending, paid, refunded
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_tenantId", ["tenantId"])
    .index("by_vehicleId", ["vehicleId"])
    .index("by_clientId", ["clientId"])
    .index("by_orgId", ["orgId"])
    .index("by_status", ["status"]),

  // Billing tables
  subscriptions: defineTable({
    orgId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    status: v.string(),
    planId: v.string(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_stripeCustomerId", ["stripeCustomerId"])
    .index("by_stripeSubscriptionId", ["stripeSubscriptionId"]),

  invoices: defineTable({
    orgId: v.string(),
    stripeInvoiceId: v.string(),
    subscriptionId: v.optional(v.id("subscriptions")),
    amount: v.number(),
    currency: v.string(),
    status: v.string(),
    paidAt: v.optional(v.number()),
    dueDate: v.number(),
    invoiceUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_stripeInvoiceId", ["stripeInvoiceId"])
    .index("by_subscriptionId", ["subscriptionId"]),

  usageRecords: defineTable({
    orgId: v.string(),
    subscriptionId: v.id("subscriptions"),
    metricType: v.string(),
    quantity: v.number(),
    timestamp: v.number(),
    createdAt: v.number(),
  })
    .index("by_orgId", ["orgId"])
    .index("by_subscriptionId", ["subscriptionId"])
    .index("by_timestamp", ["timestamp"]),
})
