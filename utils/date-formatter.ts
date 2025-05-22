/**
 * Formats a date for display
 * @param date Date to format
 * @param includeTime Whether to include the time
 * @returns Formatted date string
 */
export function formatDate(date: Date | number, includeTime = false): string {
  const dateObj = typeof date === "number" ? new Date(date) : date

  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "short",
    day: "numeric",
  }

  if (includeTime) {
    options.hour = "2-digit"
    options.minute = "2-digit"
  }

  return dateObj.toLocaleDateString("en-US", options)
}

/**
 * Returns a relative time string (e.g., "2 hours ago")
 * @param date Date to format
 * @returns Relative time string
 */
export function getRelativeTimeString(date: Date | number): string {
  const dateObj = typeof date === "number" ? new Date(date) : date
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - dateObj.getTime()) / 1000)

  if (diffInSeconds < 60) {
    return `${diffInSeconds} second${diffInSeconds !== 1 ? "s" : ""} ago`
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60)
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minute${diffInMinutes !== 1 ? "s" : ""} ago`
  }

  const diffInHours = Math.floor(diffInMinutes / 60)
  if (diffInHours < 24) {
    return `${diffInHours} hour${diffInHours !== 1 ? "s" : ""} ago`
  }

  const diffInDays = Math.floor(diffInHours / 24)
  if (diffInDays < 30) {
    return `${diffInDays} day${diffInDays !== 1 ? "s" : ""} ago`
  }

  const diffInMonths = Math.floor(diffInDays / 30)
  if (diffInMonths < 12) {
    return `${diffInMonths} month${diffInMonths !== 1 ? "s" : ""} ago`
  }

  const diffInYears = Math.floor(diffInMonths / 12)
  return `${diffInYears} year${diffInYears !== 1 ? "s" : ""} ago`
}
