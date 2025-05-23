import crypto from "crypto"

/**
 * Generate a cryptographically secure random token for share links
 * @param length - Length of the token (default: 32)
 * @returns Secure random token string
 */
export function generateSecureShareToken(length = 32): string {
  return crypto.randomBytes(length).toString("hex")
}

/**
 * Generate a secure slug for QR codes
 * @param length - Length of the slug (default: 16)
 * @returns Secure random slug string
 */
export function generateSecureSlug(length = 16): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789"
  let result = ""
  const randomBytes = crypto.randomBytes(length)

  for (let i = 0; i < length; i++) {
    result += chars[randomBytes[i] % chars.length]
  }

  return result
}

/**
 * Validate token format and length
 * @param token - Token to validate
 * @param expectedLength - Expected token length
 * @returns Boolean indicating if token is valid
 */
export function validateToken(token: string, expectedLength = 64): boolean {
  if (!token || typeof token !== "string") {
    return false
  }

  // Check length (hex tokens are 2x the byte length)
  if (token.length !== expectedLength) {
    return false
  }

  // Check if it's valid hex
  return /^[a-f0-9]+$/i.test(token)
}
