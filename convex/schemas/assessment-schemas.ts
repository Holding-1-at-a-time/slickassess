import { z } from "zod"

// Schema for creating an assessment
export const createAssessmentSchema = z.object({
  vehicleId: z.string(),
  assessmentDate: z.number().int().min(0, "Invalid date"),
  mileage: z.number().int().min(0, "Mileage cannot be negative"),
  notes: z.string().optional().or(z.literal("")),
  templateSections: z.array(
    z.object({
      id: z.string(),
      name: z.string().min(1, "Section name is required"),
      requiredImages: z.number().int().min(0, "Required images cannot be negative"),
    }),
  ),
})

// Schema for updating an assessment
export const updateAssessmentSchema = z.object({
  id: z.string(),
  assessmentDate: z.number().int().min(0, "Invalid date").optional(),
  mileage: z.number().int().min(0, "Mileage cannot be negative").optional(),
  notes: z.string().optional().or(z.literal("")),
  status: z.enum(["draft", "in_progress", "completed", "approved", "rejected"]).optional(),
  sections: z
    .array(
      z.object({
        id: z.string(),
        name: z.string().min(1, "Section name is required"),
        condition: z.string().nullable(),
        notes: z.string().nullable(),
        imageIds: z.array(z.string()),
      }),
    )
    .optional(),
  identifiedIssues: z
    .array(
      z.object({
        section: z.string(),
        severity: z.enum(["low", "medium", "high", "critical"]),
        description: z.string().min(1, "Description is required"),
      }),
    )
    .optional(),
  recommendedServices: z
    .array(
      z.object({
        name: z.string().min(1, "Service name is required"),
        description: z.string().min(1, "Description is required"),
        priority: z.enum(["low", "medium", "high"]),
      }),
    )
    .optional(),
  overallCondition: z.enum(["excellent", "good", "fair", "poor"]).optional(),
})

// Schema for completing an assessment
export const completeAssessmentSchema = z.object({
  id: z.string(),
  generateAISummary: z.boolean(),
})

// Schema for deleting an assessment
export const deleteAssessmentSchema = z.object({
  id: z.string(),
})
