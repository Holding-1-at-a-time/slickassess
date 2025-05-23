import { query } from "./_generated/server"

// Simple ping function to check database connectivity
export const ping = query({
  handler: async (ctx) => {
    return {
      status: "healthy",
      timestamp: Date.now(),
    }
  },
})

// More detailed health check
export const check = query({
  handler: async (ctx) => {
    try {
      // Check if we can query the database
      const startTime = Date.now()

      // Perform a simple query to check database performance
      const users = await ctx.db.query("users").limit(1).collect()

      const queryTime = Date.now() - startTime

      return {
        status: "healthy",
        timestamp: Date.now(),
        responseTime: queryTime,
        details: {
          database: "connected",
        },
      }
    } catch (error) {
      return {
        status: "unhealthy",
        timestamp: Date.now(),
        error: error instanceof Error ? error.message : "Unknown error",
        details: {
          database: "disconnected",
        },
      }
    }
  },
})
