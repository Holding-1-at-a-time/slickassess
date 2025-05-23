import type { NextRequest } from "next/server"
import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"
import { nanoid } from "nanoid"
import { logger } from "@/lib/logging/logger"

// Constants
const CSRF_SECRET = process.env.CSRF_SECRET || "default-csrf-secret-key-change-in-production"
const CSRF_COOKIE_NAME = "csrf_token"
const CSRF_HEADER_NAME = "x-csrf-token"
const TOKEN_EXPIRY = "1h" // 1 hour

// Generate a new CSRF token
export async function generateCsrfToken(): Promise<string> {
  try {
    const tokenId = nanoid()

    const token = await new SignJWT({ tokenId })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime(TOKEN_EXPIRY)
      .sign(new TextEncoder().encode(CSRF_SECRET))

    // Set the token in a cookie
    cookies().set({
      name: CSRF_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60, // 1 hour in seconds
    })

    return token
  } catch (error) {
    logger.error({ error }, "Error generating CSRF token")
    throw new Error("Failed to generate CSRF token")
  }
}

// Validate a CSRF token
export async function validateCsrfToken(req: NextRequest): Promise<{ valid: boolean; reason?: string }> {
  try {
    // Get the token from the cookie
    const cookieToken = cookies().get(CSRF_COOKIE_NAME)?.value

    if (!cookieToken) {
      return { valid: false, reason: "Missing CSRF cookie" }
    }

    // Get the token from the header
    const headerToken = req.headers.get(CSRF_HEADER_NAME)

    if (!headerToken) {
      return { valid: false, reason: "Missing CSRF header" }
    }

    // Tokens must match
    if (cookieToken !== headerToken) {
      return { valid: false, reason: "CSRF token mismatch" }
    }

    // Verify the token
    try {
      await jwtVerify(cookieToken, new TextEncoder().encode(CSRF_SECRET))
      return { valid: true }
    } catch (error) {
      return { valid: false, reason: "Invalid or expired CSRF token" }
    }
  } catch (error) {
    logger.error({ error }, "Error validating CSRF token")
    return { valid: false, reason: "Error validating CSRF token" }
  }
}

// Get the current CSRF token or generate a new one
export async function getCsrfToken(): Promise<string> {
  const existingToken = cookies().get(CSRF_COOKIE_NAME)?.value

  if (existingToken) {
    try {
      // Verify the token is still valid
      await jwtVerify(existingToken, new TextEncoder().encode(CSRF_SECRET))
      return existingToken
    } catch (error) {
      // Token is invalid or expired, generate a new one
      return generateCsrfToken()
    }
  }

  // No token exists, generate a new one
  return generateCsrfToken()
}
