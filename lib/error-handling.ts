import { NextResponse } from "next/server"
import { ZodError } from "zod"
import { logger } from "./logging/logger"

// Error types
export enum ErrorType {
  VALIDATION = "validation",
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  NOT_FOUND = "not_found",
  CONFLICT = "conflict",
  RATE_LIMIT = "rate_limit",
  EXTERNAL_SERVICE = "external_service",
  DATABASE = "database",
  INTERNAL = "internal",
}

// Error codes
export enum ErrorCode {
  // Validation errors
  INVALID_INPUT = "invalid_input",
  MISSING_REQUIRED_FIELD = "missing_required_field",
  INVALID_FORMAT = "invalid_format",

  // Authentication errors
  UNAUTHENTICATED = "unauthenticated",
  INVALID_CREDENTIALS = "invalid_credentials",
  SESSION_EXPIRED = "session_expired",

  // Authorization errors
  UNAUTHORIZED = "unauthorized",
  INSUFFICIENT_PERMISSIONS = "insufficient_permissions",
  FORBIDDEN_RESOURCE = "forbidden_resource",

  // Not found errors
  RESOURCE_NOT_FOUND = "resource_not_found",
  ENDPOINT_NOT_FOUND = "endpoint_not_found",

  // Conflict errors
  RESOURCE_ALREADY_EXISTS = "resource_already_exists",
  STALE_DATA = "stale_data",

  // Rate limit errors
  TOO_MANY_REQUESTS = "too_many_requests",

  // External service errors
  SERVICE_UNAVAILABLE = "service_unavailable",
  EXTERNAL_REQUEST_FAILED = "external_request_failed",

  // Database errors
  DATABASE_ERROR = "database_error",
  QUERY_FAILED = "query_failed",

  // Internal errors
  INTERNAL_SERVER_ERROR = "internal_server_error",
  UNHANDLED_EXCEPTION = "unhandled_exception",
}

// HTTP status codes mapping
const statusCodeMap: Record<ErrorType, number> = {
  [ErrorType.VALIDATION]: 400,
  [ErrorType.AUTHENTICATION]: 401,
  [ErrorType.AUTHORIZATION]: 403,
  [ErrorType.NOT_FOUND]: 404,
  [ErrorType.CONFLICT]: 409,
  [ErrorType.RATE_LIMIT]: 429,
  [ErrorType.EXTERNAL_SERVICE]: 502,
  [ErrorType.DATABASE]: 503,
  [ErrorType.INTERNAL]: 500,
}

// Application error class
export class AppError extends Error {
  type: ErrorType
  code: ErrorCode
  details?: any
  status: number

  constructor(message: string, type: ErrorType, code: ErrorCode, details?: any) {
    super(message)
    this.name = "AppError"
    this.type = type
    this.code = code
    this.details = details
    this.status = statusCodeMap[type]

    // Capture stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AppError)
    }
  }

  // Convert to JSON for logging
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      type: this.type,
      code: this.code,
      status: this.status,
      details: this.details,
      stack: this.stack,
    }
  }
}

// Function to handle API errors
export function handleApiError(error: unknown, req?: Request) {
  // Default error response
  let errorResponse = {
    success: false,
    error: "An unexpected error occurred",
    code: ErrorCode.INTERNAL_SERVER_ERROR,
    type: ErrorType.INTERNAL,
    status: 500,
  }

  // Extract request information for logging
  const requestInfo = req
    ? {
        method: req.method,
        url: req.url,
        headers: Object.fromEntries(req.headers.entries()),
      }
    : undefined

  // Handle different error types
  if (error instanceof AppError) {
    // Handle application errors
    errorResponse = {
      success: false,
      error: error.message,
      code: error.code,
      type: error.type,
      status: error.status,
    }

    // Log the error
    logger.error({
      message: `API Error: ${error.message}`,
      error: error.toJSON(),
      request: requestInfo,
    })
  } else if (error instanceof ZodError) {
    // Handle validation errors
    errorResponse = {
      success: false,
      error: "Validation error",
      code: ErrorCode.INVALID_INPUT,
      type: ErrorType.VALIDATION,
      status: 400,
      details: error.errors,
    }

    // Log the error
    logger.warn({
      message: "Validation Error",
      error: {
        name: "ZodError",
        issues: error.errors,
      },
      request: requestInfo,
    })
  } else if (error instanceof Error) {
    // Handle generic errors
    errorResponse = {
      success: false,
      error: error.message || "An unexpected error occurred",
      code: ErrorCode.UNHANDLED_EXCEPTION,
      type: ErrorType.INTERNAL,
      status: 500,
    }

    // Log the error
    logger.error({
      message: `Unhandled Error: ${error.message}`,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      request: requestInfo,
    })
  } else {
    // Handle unknown errors
    logger.error({
      message: "Unknown Error",
      error,
      request: requestInfo,
    })
  }

  // Return formatted error response
  return NextResponse.json(
    {
      success: false,
      error: errorResponse.error,
      code: errorResponse.code,
      type: errorResponse.type,
    },
    { status: errorResponse.status },
  )
}

// Error factory functions
export const createError = {
  validation: (message: string, details?: any) =>
    new AppError(message, ErrorType.VALIDATION, ErrorCode.INVALID_INPUT, details),

  authentication: (message: string, code = ErrorCode.UNAUTHENTICATED) =>
    new AppError(message, ErrorType.AUTHENTICATION, code),

  authorization: (message: string, code = ErrorCode.UNAUTHORIZED) =>
    new AppError(message, ErrorType.AUTHORIZATION, code),

  notFound: (message: string, code = ErrorCode.RESOURCE_NOT_FOUND) => new AppError(message, ErrorType.NOT_FOUND, code),

  conflict: (message: string, code = ErrorCode.RESOURCE_ALREADY_EXISTS) =>
    new AppError(message, ErrorType.CONFLICT, code),

  rateLimit: (message: string) => new AppError(message, ErrorType.RATE_LIMIT, ErrorCode.TOO_MANY_REQUESTS),

  externalService: (message: string, details?: any) =>
    new AppError(message, ErrorType.EXTERNAL_SERVICE, ErrorCode.EXTERNAL_REQUEST_FAILED, details),

  database: (message: string, details?: any) =>
    new AppError(message, ErrorType.DATABASE, ErrorCode.DATABASE_ERROR, details),

  internal: (message: string, details?: any) =>
    new AppError(message, ErrorType.INTERNAL, ErrorCode.INTERNAL_SERVER_ERROR, details),
}
