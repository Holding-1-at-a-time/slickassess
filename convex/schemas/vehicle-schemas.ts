import { z } from "zod"

// Schema for creating a vehicle
export const createVehicleSchema = z.object({
  clientId: z.string(),
  vin: z.string().min(1, "VIN is required"),
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z
    .number()
    .int()
    .min(1900, "Year must be at least 1900")
    .max(new Date().getFullYear() + 1, "Year cannot be in the future"),
  color: z.string().optional().or(z.literal("")),
  licensePlate: z.string().optional().or(z.literal("")),
  mileage: z.number().int().min(0, "Mileage cannot be negative").optional(),
  exteriorCondition: z.string().optional().or(z.literal("")),
  interiorCondition: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  features: z.array(z.string()).optional(),
})

// Schema for updating a vehicle
export const updateVehicleSchema = z.object({
  id: z.string(),
  clientId: z.string().optional(),
  vin: z.string().min(1, "VIN is required").optional(),
  make: z.string().min(1, "Make is required").optional(),
  model: z.string().min(1, "Model is required").optional(),
  year: z
    .number()
    .int()
    .min(1900, "Year must be at least 1900")
    .max(new Date().getFullYear() + 1, "Year cannot be in the future")
    .optional(),
  color: z.string().optional().or(z.literal("")),
  licensePlate: z.string().optional().or(z.literal("")),
  mileage: z.number().int().min(0, "Mileage cannot be negative").optional(),
  exteriorCondition: z.string().optional().or(z.literal("")),
  interiorCondition: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  features: z.array(z.string()).optional(),
  mainImageId: z.string().optional(),
})

// Schema for deleting a vehicle
export const deleteVehicleSchema = z.object({
  id: z.string(),
})
