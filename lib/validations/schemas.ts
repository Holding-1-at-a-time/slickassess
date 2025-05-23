import { z } from "zod"

// User schemas
export const userSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  role: z.enum(["admin", "user", "viewer"]).optional(),
})

// Client schemas
export const clientSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
})

// Vehicle schemas
export const vehicleSchema = z.object({
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z
    .number()
    .int()
    .min(1900)
    .max(new Date().getFullYear() + 1),
  vin: z.string().optional(),
  licensePlate: z.string().optional(),
  color: z.string().optional(),
  clientId: z.string().min(1, "Client ID is required"),
})

// Assessment schemas
export const assessmentSchema = z.object({
  vehicleId: z.string().min(1, "Vehicle ID is required"),
  date: z.string().or(z.date()),
  type: z.enum(["inspection", "repair", "maintenance"]),
  notes: z.string().optional(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).default("pending"),
  technician: z.string().optional(),
})

// Calendar event schemas
export const calendarEventSchema = z.object({
  title: z.string().min(1, "Title is required"),
  start: z.string().or(z.date()),
  end: z.string().or(z.date()),
  allDay: z.boolean().default(false),
  description: z.string().optional(),
  location: z.string().optional(),
  clientId: z.string().optional(),
  vehicleId: z.string().optional(),
  assessmentId: z.string().optional(),
})

// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
})

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Invalid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(8, "Password must be at least 8 characters"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })

// API schemas
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
})

export const sortSchema = z.object({
  field: z.string(),
  direction: z.enum(["asc", "desc"]).default("asc"),
})

export const filterSchema = z.record(
  z.string(),
  z
    .string()
    .or(z.number())
    .or(z.boolean())
    .or(z.array(z.string().or(z.number()).or(z.boolean()))),
)

// Combine schemas for API requests
export const apiListRequestSchema = z.object({
  pagination: paginationSchema.optional(),
  sort: sortSchema.optional(),
  filters: filterSchema.optional(),
})
