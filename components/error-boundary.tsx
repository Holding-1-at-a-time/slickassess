"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { AlertTriangle } from "lucide-react"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
}

export function ErrorBoundary({ children, fallback, onError }: ErrorBoundaryProps) {
  const [error, setError] = useState<Error | null>(null)
  const [errorInfo, setErrorInfo] = useState<React.ErrorInfo | null>(null)

  useEffect(() => {
    if (error && onError) {
      onError(error, errorInfo!)
    }
  }, [error, errorInfo, onError])

  if (error) {
    return fallback ? (
      <>{fallback}</>
    ) : (
      <div className="flex flex-col items-center justify-center p-6 rounded-lg border border-red-200 bg-red-50 dark:bg-red-950/20 dark:border-red-800/30 my-4">
        <AlertTriangle className="h-10 w-10 text-red-500 mb-4" />
        <h2 className="text-lg font-semibold text-red-700 dark:text-red-400 mb-2">Something went wrong</h2>
        <p className="text-sm text-red-600 dark:text-red-300 mb-4 text-center">
          {error.message || "An unexpected error occurred"}
        </p>
        <Button
          variant="outline"
          onClick={() => {
            setError(null)
            setErrorInfo(null)
          }}
        >
          Try again
        </Button>
      </div>
    )
  }

  try {
    return <>{children}</>
  } catch (err: any) {
    const error = err instanceof Error ? err : new Error(String(err))
    setError(error)
    setErrorInfo({
      componentStack: error.stack || "",
    } as React.ErrorInfo)
    return null
  }
}
