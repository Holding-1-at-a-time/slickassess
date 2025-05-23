"use client"

import type React from "react"

import { ErrorBoundary } from "@/components/error-boundary"
import { useRouter } from "next/navigation"

export function withErrorBoundary<P extends object>(Component: React.ComponentType<P>, fallback?: React.ReactNode) {
  return function WithErrorBoundary(props: P) {
    const router = useRouter()

    const handleError = (error: Error) => {
      // Log the error to your analytics or error tracking service
      console.error("Error caught by boundary:", error)

      // You could also send this to a server endpoint
      // fetch('/api/log-error', { method: 'POST', body: JSON.stringify({ error: error.message, stack: error.stack }) })
    }

    return (
      <ErrorBoundary fallback={fallback} onError={handleError}>
        <Component {...props} />
      </ErrorBoundary>
    )
  }
}
