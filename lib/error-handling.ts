import { NextResponse } from "next/server"
import { logger } from "@/lib/logging/logger"

export type ErrorResponse = {
  success: false
  error: string
  code: string
  details?: any
  status: number
}

export type ErrorOptions = {
  code?: string
  details?: any
  status?: number
  log?: boolean
  logLevel?: "error" | "warn" | "info"
}

export class AppError extends Error {
  code: string
  details?: any
  status: number

  constructor(message: string, options: ErrorOptions = {}) {
    super(message)
    this.name = "AppError"
    this.code = options.code || "INTERNAL_ERROR"
    this.details = options.details
    this.status = options.status || 500

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }
}

export function handleApiError(error: unknown, defaultMessage = "An unexpected error occurred") {
  // Determine if this is a known AppError or an unknown error
  const isAppError = error instanceof AppError

  // Get error details
  const message = isAppError ? error.message : error instanceof Error ? error.message : defaultMessage

  const code = isAppError ? error.code : "INTERNAL_ERROR"
  const status = isAppError ? error.status : 500
  const details = isAppError ? error.details : undefined

  // Log the error
  logger.error({
    message: `API Error: ${message}`,
    code,
    status,
    details,
    stack: error instanceof Error ? error.stack : undefined,
  })

  // Return formatted error response
  return NextResponse.json(
    {
      success: false,
      error: message,
      code,
      details,
    },
    { status },
  )
}

export function createErrorResponse(message: string, options: ErrorOptions = {}): ErrorResponse {
  const { code = "INTERNAL_ERROR", details, status = 500, log = true, logLevel = "error" } = options

  if (log) {
    const logMethod = logger[logLevel]
    logMethod?.({
      message: `Error: ${message}`,
      code,
      status,
      details,
    })
  }

  return {
    success: false,
    error: message,
    code,
    details,
    status,
  }
}

// Common error factories
export const errors = {
  unauthorized: (message = "Unauthorized access", details?: any) =>
    new AppError(message, { code: "UNAUTHORIZED", status: 401, details }),

  forbidden: (message = "Access forbidden", details?: any) =>
    new AppError(message, { code: "FORBIDDEN", status: 403, details }),

  notFound: (message = "Resource not found", details?: any) =>
    new AppError(message, { code: "NOT_FOUND", status: 404, details }),

  badRequest: (message = "Invalid request", details?: any) =>
    new AppError(message, { code: "BAD_REQUEST", status: 400, details }),

  conflict: (message = "Resource conflict", details?: any) =>
    new AppError(message, { code: "CONFLICT", status: 409, details }),

  tooManyRequests: (message = "Rate limit exceeded", details?: any) =>
    new AppError(message, { code: "RATE_LIMIT_EXCEEDED", status: 429, details }),

  internal: (message = "Internal server error", details?: any) =>
    new AppError(message, { code: "INTERNAL_ERROR", status: 500, details }),

  serviceUnavailable: (message = "Service unavailable", details?: any) =>
    new AppError(message, { code: "SERVICE_UNAVAILABLE", status: 503, details }),
}
