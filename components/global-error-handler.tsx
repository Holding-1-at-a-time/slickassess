"use client"

import { useEffect } from "react"

export function GlobalErrorHandler() {
  useEffect(() => {
    const originalOnError = window.onerror
    const originalOnUnhandledRejection = window.onunhandledrejection

    // Handle synchronous errors
    window.onerror = (message, source, lineno, colno, error) => {
      // Log to your analytics or error tracking service
      console.error("Global error:", { message, source, lineno, colno, error })

      // You could also send this to a server endpoint
      // fetch('/api/log-error', { method: 'POST', body: JSON.stringify({ message, source, lineno, colno, stack: error?.stack }) })

      // Call the original handler if it exists
      if (originalOnError) {
        return originalOnError(message, source, lineno, colno, error)
      }
      return false
    }

    // Handle promise rejections
    window.onunhandledrejection = (event) => {
      // Log to your analytics or error tracking service
      console.error("Unhandled rejection:", event.reason)

      // You could also send this to a server endpoint
      // fetch('/api/log-error', { method: 'POST', body: JSON.stringify({ message: event.reason?.message, stack: event.reason?.stack }) })

      // Call the original handler if it exists
      if (originalOnUnhandledRejection) {
        originalOnUnhandledRejection(event)
      }
    }

    return () => {
      window.onerror = originalOnError
      window.onunhandledrejection = originalOnUnhandledRejection
    }
  }, [])

  return null
}
