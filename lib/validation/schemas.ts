import { z } from "zod"

// Common schemas
export const idSchema = z.string().min(1, "ID is required")
export const emailSchema = z.string().email("Invalid email address")
export const dateSchema = z.string().refine((value) => !isNaN(Date.parse(value)), { message: "Invalid date format" })

// API-specific schemas
export const analyticsQuerySchema = z.object({
  startDate: dateSchema.optional(),
  endDate: dateSchema.optional(),
  metric: z.string().min(1, "Metric is required"),
  clientId: idSchema.optional(),
  vehicleId: idSchema.optional(),
})

export const createCheckoutSessionSchema = z.object({
  priceId: z.string().min(1, "Price ID is required"),
})

export const calendarSyncSchema = z.object({
  startDate: dateSchema,
  endDate: dateSchema,
  includeDeclined: z.boolean().optional(),
})

export const uploadImageSchema = z.object({
  file: z.any(),
})

export const analyzeVehicleImageSchema = z.object({
  imageUrl: z.string().url("Invalid image URL"),
  imageId: idSchema,
  vehicleId: idSchema,
  assessmentId: idSchema.optional(),
  analysisType: z.enum(["exterior", "interior"], {
    errorMap: () => ({ message: "Analysis type must be 'exterior' or 'interior'" }),
  }),
})

export const generateReportSchema = z.object({
  assessmentId: idSchema,
})

export const emailReportSchema = z.object({
  assessmentData: z.object({
    vehicleInfo: z.object({
      year: z.number(),
      make: z.string(),
      model: z.string(),
      bodyType: z.string().optional(),
      size: z.string().optional(),
    }),
    exteriorAnalysis: z.object({
      overallCondition: z.string(),
      totalDamageCount: z.number(),
      damages: z.array(
        z.object({
          description: z.string(),
          severity: z.string(),
          priceImpact: z.number(),
        }),
      ),
    }),
    interiorAnalysis: z.object({
      overallCleanliness: z.string(),
      issues: z.array(
        z.object({
          description: z.string(),
          severity: z.string(),
          priceImpact: z.number(),
        }),
      ),
    }),
    estimatedDuration: z.object({
      total: z.number(),
    }),
    pricingBreakdown: z.object({
      basePrice: z.number(),
      subtotal: z.number(),
      taxes: z.number(),
      total: z.number(),
    }),
  }),
  emailAddress: emailSchema,
  customerInfo: z
    .object({
      name: z.string(),
      email: emailSchema,
      phone: z.string().optional(),
    })
    .optional(),
  businessInfo: z
    .object({
      name: z.string(),
      address: z.string(),
      phone: z.string(),
      email: emailSchema,
    })
    .optional(),
  reportNumber: z.string(),
  generatedDate: dateSchema,
})

export const signatureSubmitSchema = z.object({
  reportId: idSchema,
  approvalData: z.object({
    finalSignature: z.object({
      signature: z.string().min(1, "Signature is required"),
      signerName: z.string().min(1, "Signer name is required"),
      signerEmail: emailSchema,
      signedAt: z.string(),
      userAgent: z.string().optional(),
      signatureHash: z.string(),
    }),
    approvalType: z.string().optional(),
    approvalNotes: z.string().optional(),
  }),
  customerInfo: z
    .object({
      name: z.string(),
      email: emailSchema,
      phone: z.string().optional(),
    })
    .optional(),
  businessInfo: z
    .object({
      name: z.string(),
      address: z.string(),
      phone: z.string(),
      email: emailSchema,
    })
    .optional(),
})
