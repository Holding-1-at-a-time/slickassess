import pino from "pino"
import { createWriteStream } from "pino-http-send"
import { createStream } from "rotating-file-stream"
import path from "path"

// Define log levels
type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal"

// Environment-specific configuration
const isDevelopment = process.env.NODE_ENV === "development"
const isTest = process.env.NODE_ENV === "test"

// Configure log rotation
const logDirectory = path.join(process.cwd(), "logs")
const rotatingStream = createStream("application.log", {
  size: "10M", // rotate every 10 MegaBytes written
  interval: "1d", // rotate daily
  compress: "gzip", // compress rotated files
  path: logDirectory,
})

// External service integration (if configured)
const externalStreams = []

// Add Datadog stream if configured
if (process.env.DATADOG_API_KEY) {
  externalStreams.push(
    createWriteStream({
      url: "https://http-intake.logs.datadoghq.com/api/v2/logs",
      headers: {
        "Content-Type": "application/json",
        "DD-API-KEY": process.env.DATADOG_API_KEY,
      },
      batchSize: 1, // Adjust based on your needs
    }),
  )
}

// Configure base logger
const baseLogger = pino(
  {
    level: process.env.LOG_LEVEL || (isDevelopment ? "debug" : "info"),
    timestamp: pino.stdTimeFunctions.isoTime,
    base: {
      env: process.env.NODE_ENV,
      version: process.env.APP_VERSION || "unknown",
    },
    formatters: {
      level: (label) => {
        return { level: label }
      },
    },
    redact: {
      paths: [
        "password",
        "passwordConfirmation",
        "secret",
        "token",
        "authorization",
        "*.password",
        "*.secret",
        "*.token",
      ],
      censor: "[REDACTED]",
    },
  },
  // Configure output streams
  pino.multistream([
    // Console output for development
    { stream: process.stdout },
    // File output with rotation
    { stream: rotatingStream },
    // External services
    ...externalStreams,
  ]),
)

// Create a request context logger
export const logger = baseLogger.child({})

// Request context middleware for Next.js API routes
export function withLogging(handler: Function) {
  return async (req: any, res: any) => {
    const start = Date.now()
    const requestId = req.headers["x-request-id"] || crypto.randomUUID()

    // Create request-specific logger
    const requestLogger = logger.child({
      requestId,
      method: req.method,
      url: req.url,
      ip: req.headers["x-forwarded-for"] || req.connection.remoteAddress,
      userAgent: req.headers["user-agent"],
    })

    // Attach logger to request object
    req.log = requestLogger

    requestLogger.info({ message: "Request started" })

    try {
      // Execute the handler
      const result = await handler(req, res)

      // Log request completion
      const duration = Date.now() - start
      requestLogger.info({
        message: "Request completed",
        duration,
        status: res.statusCode,
      })

      return result
    } catch (error) {
      // Log error
      const duration = Date.now() - start
      requestLogger.error({
        message: "Request failed",
        error: error instanceof Error ? error.message : "Unknown error",
        stack: error instanceof Error ? error.stack : undefined,
        duration,
        status: res.statusCode || 500,
      })

      throw error
    }
  }
}

// Helper to create a context-specific logger
export function createContextLogger(context: Record<string, any>) {
  return logger.child(context)
}

// Export specific logging methods for convenience
export const log = {
  trace: (data: any) => logger.trace(data),
  debug: (data: any) => logger.debug(data),
  info: (data: any) => logger.info(data),
  warn: (data: any) => logger.warn(data),
  error: (data: any) => logger.error(data),
  fatal: (data: any) => logger.fatal(data),
}
