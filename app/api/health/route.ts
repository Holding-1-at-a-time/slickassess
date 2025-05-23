import { NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"

// Create a Convex client
const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function GET() {
  try {
    const startTime = Date.now()

    // Check database connection
    let dbStatus = "healthy"
    let dbResponseTime = 0

    try {
      const dbStartTime = Date.now()
      // Perform a simple query to check database connectivity
      await convexClient.query(api.health.ping)
      dbResponseTime = Date.now() - dbStartTime
    } catch (error) {
      dbStatus = "unhealthy"
      console.error("Database health check failed:", error)
    }

    // Check external services
    const externalServices = {
      stripe: await checkStripeHealth(),
      clerk: await checkClerkHealth(),
      googleCalendar: await checkGoogleCalendarHealth(),
    }

    // Calculate overall status
    const isHealthy =
      dbStatus === "healthy" && Object.values(externalServices).every((service) => service.status === "healthy")

    // Calculate response time
    const responseTime = Date.now() - startTime

    return NextResponse.json({
      status: isHealthy ? "healthy" : "unhealthy",
      timestamp: new Date().toISOString(),
      responseTime: `${responseTime}ms`,
      services: {
        database: {
          status: dbStatus,
          responseTime: `${dbResponseTime}ms`,
        },
        ...externalServices,
      },
      version: process.env.APP_VERSION || "unknown",
      environment: process.env.NODE_ENV,
    })
  } catch (error) {
    console.error("Health check failed:", error)

    return NextResponse.json(
      {
        status: "unhealthy",
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}

// Helper functions to check external services
async function checkStripeHealth() {
  try {
    // Simple check to see if Stripe API key is configured
    const isConfigured = !!process.env.STRIPE_SECRET_KEY

    return {
      status: isConfigured ? "healthy" : "misconfigured",
      details: isConfigured ? "API key configured" : "API key missing",
    }
  } catch (error) {
    return {
      status: "unhealthy",
      details: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

async function checkClerkHealth() {
  try {
    // Simple check to see if Clerk API key is configured
    const isConfigured = !!process.env.CLERK_SECRET_KEY

    return {
      status: isConfigured ? "healthy" : "misconfigured",
      details: isConfigured ? "API key configured" : "API key missing",
    }
  } catch (error) {
    return {
      status: "unhealthy",
      details: error instanceof Error ? error.message : "Unknown error",
    }
  }
}

async function checkGoogleCalendarHealth() {
  try {
    // Simple check to see if Google Calendar API key is configured
    const isConfigured = !!process.env.GOOGLE_API_KEY

    return {
      status: isConfigured ? "healthy" : "misconfigured",
      details: isConfigured ? "API key configured" : "API key missing",
    }
  } catch (error) {
    return {
      status: "unhealthy",
      details: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
