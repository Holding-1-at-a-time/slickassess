import { type NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { logger } from "@/lib/logging/logger"

export type ValidationConfig<T extends z.ZodTypeAny> = {
  schema: T
  source: "query" | "body" | "params" | "headers"
}

export function validateRequest<T extends z.ZodTypeAny>(
  req: NextRequest,
  config: ValidationConfig<T>,
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  try {
    let data: unknown

    switch (config.source) {
      case "query":
        const url = new URL(req.url)
        const queryParams: Record<string, string> = {}
        url.searchParams.forEach((value, key) => {
          queryParams[key] = value
        })
        data = queryParams
        break
      case "body":
        // For body, we need to clone the request to avoid consuming the body
        const clonedReq = req.clone()
        // We'll parse the body asynchronously later
        data = clonedReq.json()
        break
      case "headers":
        const headers: Record<string, string> = {}
        req.headers.forEach((value, key) => {
          headers[key] = value
        })
        data = headers
        break
      case "params":
        // Params should be passed separately
        throw new Error("Params validation requires passing params explicitly")
      default:
        throw new Error(`Unsupported validation source: ${config.source}`)
    }

    // Handle async data (like request body)
    if (data instanceof Promise) {
      return {
        success: false,
        error: new z.ZodError([
          {
            code: "custom",
            message: "Async validation not supported in synchronous validator",
            path: [],
          },
        ]),
      }
    }

    const result = config.schema.safeParse(data)

    if (result.success) {
      return { success: true, data: result.data }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    logger.error({ error }, "Error in validateRequest")
    return {
      success: false,
      error: new z.ZodError([
        {
          code: "custom",
          message: error instanceof Error ? error.message : "Unknown validation error",
          path: [],
        },
      ]),
    }
  }
}

export async function validateRequestAsync<T extends z.ZodTypeAny>(
  req: NextRequest,
  config: ValidationConfig<T>,
): Promise<{ success: true; data: z.infer<T> } | { success: false; error: z.ZodError }> {
  try {
    let data: unknown

    switch (config.source) {
      case "query":
        const url = new URL(req.url)
        const queryParams: Record<string, string> = {}
        url.searchParams.forEach((value, key) => {
          queryParams[key] = value
        })
        data = queryParams
        break
      case "body":
        try {
          // Clone the request to avoid consuming the body
          const clonedReq = req.clone()
          data = await clonedReq.json()
        } catch (error) {
          logger.error({ error }, "Error parsing request body")
          return {
            success: false,
            error: new z.ZodError([
              {
                code: "custom",
                message: "Invalid JSON in request body",
                path: [],
              },
            ]),
          }
        }
        break
      case "headers":
        const headers: Record<string, string> = {}
        req.headers.forEach((value, key) => {
          headers[key] = value
        })
        data = headers
        break
      case "params":
        // Params should be passed separately
        throw new Error("Params validation requires passing params explicitly")
      default:
        throw new Error(`Unsupported validation source: ${config.source}`)
    }

    const result = config.schema.safeParse(data)

    if (result.success) {
      return { success: true, data: result.data }
    } else {
      return { success: false, error: result.error }
    }
  } catch (error) {
    logger.error({ error }, "Error in validateRequestAsync")
    return {
      success: false,
      error: new z.ZodError([
        {
          code: "custom",
          message: error instanceof Error ? error.message : "Unknown validation error",
          path: [],
        },
      ]),
    }
  }
}

export function validateParams<T extends z.ZodTypeAny>(
  params: unknown,
  schema: T,
): { success: true; data: z.infer<T> } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(params)

  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, error: result.error }
  }
}

export function createValidationMiddleware<T extends z.ZodTypeAny>(config: ValidationConfig<T>) {
  return async (req: NextRequest) => {
    const validation = await validateRequestAsync(req, config)

    if (!validation.success) {
      return NextResponse.json(
        {
          error: "Validation Error",
          details: validation.error.errors.map((err) => ({
            path: err.path.join("."),
            message: err.message,
          })),
        },
        { status: 400 },
      )
    }

    // Attach the validated data to the request for the handler to use
    return validation.data
  }
}

export function handleValidationErrors(validation: ReturnType<typeof validateRequest>) {
  if (!validation.success) {
    return NextResponse.json(
      {
        error: "Validation Error",
        details: validation.error.errors.map((err) => ({
          path: err.path.join("."),
          message: err.message,
        })),
      },
      { status: 400 },
    )
  }
  return null
}
