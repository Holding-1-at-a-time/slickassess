/**
    * @description      : 
    * @author           : rrome
    * @group            : 
    * @created          : 22/05/2025 - 22:26:26
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 22/05/2025
    * - Author          : rrome
    * - Modification    : 
**/
"use node"

/**
 * Utility functions for sanitizing user inputs to prevent security issues
 */

/**
 * Sanitizes a string for safe use in database queries
 * Removes any potentially dangerous characters and trims whitespace
 */
export function sanitizeString(input: string | null | undefined): string {
  if (input === null || input === undefined) {
    return ""
  }

  // Trim whitespace
  const trimmed = input.trim()

  // Basic sanitization - remove control characters and non-printable characters
  return trimmed.replace(/[\x00-\x1F\x7F-\x9F]/g, "")
}

/**
 * Sanitizes a search query string
 * Removes special characters that could be used for injection attacks
 */
export function sanitizeSearchQuery(query: string | null | undefined): string {
  if (query === null || query === undefined) {
    return ""
  }

  const trimmed = query.trim()

  // Remove characters that could be used in injection attacks
  // This is a basic implementation - adjust based on your specific needs
  return trimmed.replace(/[\\^$.|?*+()[\]{}]/g, "")
}

/**
 * Validates if a string is a valid email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

/**
 * Validates if a string is a valid phone number format
 * This is a simple implementation - adjust based on your requirements
 */
export function isValidPhone(phone: string): boolean {
  const phoneRegex = /^[+]?[(]?[0-9]{3}[)]?[-\s.]?[0-9]{3}[-\s.]?[0-9]{4,6}$/
  return phoneRegex.test(phone)
}
