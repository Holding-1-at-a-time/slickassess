import { z } from "zod"

// Client information schema
export const clientInfoSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(100, "Name is too long"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
})

// Vehicle information schema
export const vehicleInfoSchema = z.object({
  make: z.string().min(1, "Vehicle make is required"),
  model: z.string().min(1, "Vehicle model is required"),
  year: z
    .string()
    .min(4, "Please enter a valid year")
    .refine(
      (val) => {
        const year = Number.parseInt(val)
        const currentYear = new Date().getFullYear()
        return !isNaN(year) && year >= 1900 && year <= currentYear + 1
      },
      { message: "Please enter a valid year between 1900 and next year" },
    ),
  color: z.string().optional(),
  licensePlate: z.string().optional(),
  mileage: z
    .string()
    .optional()
    .refine(
      (val) => {
        if (!val) return true
        const mileage = Number.parseInt(val)
        return !isNaN(mileage) && mileage >= 0 && mileage <= 1000000
      },
      { message: "Please enter a valid mileage between 0 and 1,000,000" },
    ),
})

// Assessment information schema
export const assessmentInfoSchema = z.object({
  hasScratches: z.boolean().default(false),
  hasDents: z.boolean().default(false),
  hasRust: z.boolean().default(false),
  hasInteriorDamage: z.boolean().default(false),
  notes: z.string().max(1000, "Notes must be less than 1000 characters").optional(),
})

// Images schema
export const imagesSchema = z.array(z.string().url("Invalid image URL")).optional()

// Complete form schema
export const selfAssessmentSchema = z.object({
  clientInfo: clientInfoSchema,
  vehicleInfo: vehicleInfoSchema,
  assessmentInfo: assessmentInfoSchema,
  images: imagesSchema,
})

// Types derived from schemas
export type ClientInfoSchema = z.infer<typeof clientInfoSchema>
export type VehicleInfoSchema = z.infer<typeof vehicleInfoSchema>
export type AssessmentInfoSchema = z.infer<typeof assessmentInfoSchema>
export type SelfAssessmentSchema = z.infer<typeof selfAssessmentSchema>
