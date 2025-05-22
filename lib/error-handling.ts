/**
    * @description      : 
    * @author           : rrome
    * @group            : 
    * @created          : 22/05/2025 - 16:15:56
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 22/05/2025
    * - Author          : rrome
    * - Modification    : 
**/
import { toast } from "@/components/ui/use-toast"

// Error types for better categorization
export enum ErrorType {
  AUTHENTICATION = "authentication",
  AUTHORIZATION = "authorization",
  VALIDATION = "validation",
  NOT_FOUND = "not_found",
  SERVER = "server",
  NETWORK = "network",
  UNKNOWN = "unknown",
}

// Structured error object
export interface AppError {
  type: ErrorType
  message: string
  code?: string
  details?: Record<string, any>
  originalError?: any
}

// Function to create a structured error
export function createError(
  type: ErrorType,
  message: string,
  options?: {
    code?: string
    details?: Record<string, any>
    originalError?: any
  },
): AppError {
  return {
    type,
    message,
    code: options?.code,
    details: options?.details,
    originalError: options?.originalError,
  }
}

// Function to handle errors in a consistent way
export function handleError(error: unknown, options?: { silent?: boolean; logToServer?: boolean }): AppError {
  const silent = options?.silent ?? false
  const logToServer = options?.logToServer ?? true

  // Default error
  let appError: AppError = {
    type: ErrorType.UNKNOWN,
    message: "An unexpected error occurred",
  }

  // Parse the error
  if (error instanceof Error) {
    // Extract error type from error name or message
    let type = ErrorType.UNKNOWN
    if (error.message.includes("authentication") || error.message.includes("unauthorized")) {
      type = ErrorType.AUTHENTICATION
    } else if (error.message.includes("permission") || error.message.includes("access denied")) {
      type = ErrorType.AUTHORIZATION
    } else if (error.message.includes("validation") || error.message.includes("invalid")) {
      type = ErrorType.VALIDATION
    } else if (error.message.includes("not found")) {
      type = ErrorType.NOT_FOUND
    }

    appError = {
      type,
      message: error.message,
      originalError: error,
    }
  } else if (typeof error === "string") {
    appError.message = error
  } else if (error && typeof error === "object" && "message" in error && typeof error.message === "string") {
    appError.message = error.message
    appError.originalError = error
  }

  // Log the error
  if (logToServer) {
    // In a real app, you would send this to your logging service
    console.error("Application error:", appError)
  }

  // Show toast notification if not silent
  if (!silent) {
    toast({
      title: getErrorTitle(appError.type),
      description: appError.message,
      variant: "destructive",
    })
  }

  return appError
}

// Helper to get a user-friendly error title
function getErrorTitle(type: ErrorType): string {
  switch (type) {
    case ErrorType.AUTHENTICATION:
      return "Authentication Error"
    case ErrorType.AUTHORIZATION:
      return "Authorization Error"
    case ErrorType.VALIDATION:
      return "Validation Error"
    case ErrorType.NOT_FOUND:
      return "Not Found"
    case ErrorType.SERVER:
      return "Server Error"
    case ErrorType.NETWORK:
      return "Network Error"
    case ErrorType.UNKNOWN:
    default:
      return "Error"
  }
}

// Custom hook for try/catch patterns in React components
export function useTryCatch() {
  return async <T>(
    fn: () => Promise<T>,
    options?: { silent?: boolean; logToServer?: boolean }
  ): Promise<T | null> => {
    try {
      return await fn()
    } catch (error) {
      handleError(error, options)
      return null
    }
  }
}
