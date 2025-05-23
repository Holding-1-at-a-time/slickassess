"use client"

import React from "react"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw } from "lucide-react"
import { useRouter } from "next/navigation"
import { logger } from "@/lib/logging/logger"

interface ErrorBoundaryProps {
  children: React.ReactNode
  fallback?: React.ReactNode
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void
  resetKeys?: any[]
}

interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class ErrorBoundaryClass extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error to our logging service
    logger.error({ error, errorInfo }, "Component error caught by ErrorBoundary")

    // Call the onError callback if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo)
    }
  }

  componentDidUpdate(prevProps: ErrorBoundaryProps) {
    // Reset the error state if any of the resetKeys change
    if (this.state.hasError && this.props.resetKeys) {
      const hasKeyChanged = this.props.resetKeys.some((key, index) => {
        return prevProps.resetKeys?.[index] !== key
      })

      if (hasKeyChanged) {
        this.setState({ hasError: false, error: undefined })
      }
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return <ErrorFallback error={this.state.error} />
    }

    return this.props.children
  }
}

// Functional wrapper for the class component
export function ErrorBoundary({ children, fallback, onError, resetKeys }: ErrorBoundaryProps) {
  return (
    <ErrorBoundaryClass fallback={fallback} onError={onError} resetKeys={resetKeys}>
      {children}
    </ErrorBoundaryClass>
  )
}

// Default fallback UI component
export function ErrorFallback({ error }: { error?: Error }) {
  const router = useRouter()
  const [errorId] = useState(`error-${Date.now().toString(36)}`)

  useEffect(() => {
    // Report the error to our monitoring system
    logger.error({ error, errorId }, "Error rendered in ErrorFallback component")
  }, [error, errorId])

  return (
    <Card className="w-full max-w-md mx-auto my-8 border-red-200 shadow-lg">
      <CardHeader className="bg-red-50 dark:bg-red-900/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-red-500" />
          <CardTitle className="text-red-700 dark:text-red-300">Something went wrong</CardTitle>
        </div>
        <CardDescription className="text-red-600/80 dark:text-red-400/80">
          We encountered an unexpected error
        </CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          <p>Error ID: {errorId}</p>
          {error && process.env.NODE_ENV === "development" && (
            <div className="mt-2 p-2 bg-gray-100 dark:bg-gray-800 rounded overflow-auto max-h-32">
              <p className="font-mono text-xs">{error.toString()}</p>
            </div>
          )}
        </div>
        <p className="text-sm">Please try refreshing the page or contact support if the problem persists.</p>
      </CardContent>
      <CardFooter className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={() => router.back()} className="text-gray-600 dark:text-gray-300">
          Go Back
        </Button>
        <Button onClick={() => window.location.reload()} className="bg-[#00ae98] hover:bg-[#00ae98]/90 text-white">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh Page
        </Button>
      </CardFooter>
    </Card>
  )
}

// Section-specific error boundary
export function SectionErrorBoundary({
  children,
  section,
}: {
  children: React.ReactNode
  section: string
}) {
  return (
    <ErrorBoundary
      onError={(error) => {
        logger.error({ error, section }, `Error in section: ${section}`)
      }}
      fallback={
        <div className="p-4 border border-red-200 rounded-md bg-red-50 dark:bg-red-900/10 dark:border-red-900/20">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <h3 className="text-sm font-medium text-red-800 dark:text-red-300">Error in {section}</h3>
          </div>
          <p className="text-xs text-red-600 dark:text-red-400">
            This section encountered an error. The rest of the page is still functional.
          </p>
          <Button
            variant="link"
            size="sm"
            onClick={() => window.location.reload()}
            className="text-xs text-red-700 dark:text-red-300 p-0 h-auto mt-2"
          >
            Refresh
          </Button>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  )
}
