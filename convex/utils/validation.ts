import { ConvexError } from "convex/server"
import { z } from "zod"

/**
 * Validates data against a Zod schema and returns the validated data
 * @param schema Zod schema to validate against
 * @param data Data to validate
 * @returns Validated and typed data
 */
export function validateWithZod<T extends z.ZodType>(schema: T, data: unknown): z.infer<T> {
  try {
    return schema.parse(data)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map((err) => ({
        path: err.path.join("."),
        message: err.message,
      }))

      throw new ConvexError({
        code: 400,
        message: "Validation error",
        details: formattedErrors,
      })
    }

    throw new ConvexError({
      code: 400,
      message: "Invalid data provided",
    })
  }
}

/**
 * Creates a validation middleware for Convex functions
 * @param schema Zod schema to validate against
 * @returns Validated data or throws an error
 */
export function createValidator<T extends z.ZodType>(schema: T) {
  return (data: unknown): z.infer<T> => validateWithZod(schema, data)
}
