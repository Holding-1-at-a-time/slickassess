import { auth } from "@clerk/nextjs/server"
import { logger } from "@/lib/logging/logger"

export async function getAuthTokenWithRecovery(options: { template: string }) {
  const { userId, getToken } = auth()

  if (!userId) {
    throw new Error("User not authenticated")
  }

  try {
    // Try to get the token
    const token = await getToken(options)
    return token
  } catch (error) {
    // Log the error
    logger.error({ error, userId }, "Error getting auth token")

    // Throw a more specific error
    throw new Error("Failed to authenticate with the server. Please refresh the page and try again.")
  }
}

export async function validateAuthSession() {
  const { userId, sessionId } = auth()

  if (!userId || !sessionId) {
    return {
      valid: false,
      error: "No active session",
    }
  }

  return {
    valid: true,
    userId,
    sessionId,
  }
}
