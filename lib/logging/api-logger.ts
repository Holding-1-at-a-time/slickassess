import { type NextRequest, NextResponse } from "next/server"
import { logger } from "./logger"

export async function withApiLogger(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
): Promise<NextResponse> {
  const requestId = req.headers.get("x-request-id") || crypto.randomUUID()
  const start = Date.now()

  // Create request-specific logger
  const requestLogger = logger.child({
    requestId,
    method: req.method,
    url: req.url,
    ip: req.headers.get("x-forwarded-for") || "unknown",
    userAgent: req.headers.get("user-agent") || "unknown",
  })

  requestLogger.info({ message: "API request started" })

  try {
    // Execute the handler
    const response = await handler(req)

    // Log request completion
    const duration = Date.now() - start
    requestLogger.info({
      message: "API request completed",
      duration,
      status: response.status,
    })

    // Add request ID to response headers
    response.headers.set("x-request-id", requestId)

    return response
  } catch (error) {
    // Log error
    const duration = Date.now() - start
    requestLogger.error({
      message: "API request failed",
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
      duration,
    })

    // Return error response
    const errorMessage = error instanceof Error ? error.message : "Internal Server Error"
    const response = NextResponse.json({ error: errorMessage }, { status: 500 })

    // Add request ID to response headers
    response.headers.set("x-request-id", requestId)

    return response
  }
}
