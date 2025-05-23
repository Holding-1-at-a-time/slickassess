import { z } from "zod"
import { type NextRequest, NextResponse } from "next/server"

export type ValidationResult<T> = { success: true; data: T } | { success: false; errors: z.ZodError }

export async function validateRequest<T>(req: NextRequest, schema: z.ZodSchema<T>): Promise<ValidationResult<T>> {
  try {
    let body: unknown

    const contentType = req.headers.get("content-type")
    if (contentType?.includes("application/json")) {
      body = await req.json()
    } else if (contentType?.includes("multipart/form-data")) {
      const formData = await req.formData()
      body = Object.fromEntries(formData)
    } else {
      // Default to text
      const text = await req.text()
      try {
        body = JSON.parse(text)
      } catch {
        body = text
      }
    }

    const data = schema.parse(body)
    return { success: true, data }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error }
    }
    throw error
  }
}

export function createValidationMiddleware<T>(schema: z.ZodSchema<T>) {
  return async (req: NextRequest) => {
    const result = await validateRequest(req, schema)

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Validation failed",
          details: result.errors.errors.map((err) => ({
            path: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 },
      )
    }
    // Attach the validated data to the request for downstream handlers
    ;(req as any).validatedData = result.data

    return null // Continue to the next middleware or handler
  }
}

export function validateFormData<T>(formData: FormData, schema: z.ZodSchema<T>): ValidationResult<T> {
  try {
    const data = Object.fromEntries(formData.entries())
    const validatedData = schema.parse(data)
    return { success: true, data: validatedData }
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, errors: error }
    }
    throw error
  }
}
