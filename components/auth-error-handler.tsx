"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useAuth, useClerk } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle, RefreshCw, LogIn } from "lucide-react"
import { logger } from "@/lib/logging/logger"

interface AuthErrorHandlerProps {
  children: React.ReactNode
}

export function AuthErrorHandler({ children }: AuthErrorHandlerProps) {
  const { isLoaded, isSignedIn, sessionId } = useAuth()
  const { session } = useClerk()
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [isRecovering, setIsRecovering] = useState(false)

  // Monitor for session errors
  useEffect(() => {
    if (!isLoaded) return

    // Check for session errors
    const checkSession = async () => {
      try {
        if (session && sessionId) {
          // Check if the session is active
          const isActive = session.status === "active"

          if (!isActive) {
            setError("Your session is no longer active")
          }
        }
      } catch (err) {
        logger.error({ err }, "Error checking session status")
        setError("There was a problem with your authentication session")
      }
    }

    checkSession()

    // Set up interval to periodically check session
    const interval = setInterval(checkSession, 60000) // Check every minute

    return () => clearInterval(interval)
  }, [isLoaded, session, sessionId])

  // Handle session recovery
  const recoverSession = async () => {
    setIsRecovering(true)

    try {
      if (session) {
        // Attempt to refresh the session
        await session.touch()
        setError(null)
      } else {
        // No session to recover, redirect to sign in
        router.push("/sign-in")
      }
    } catch (err) {
      logger.error({ err }, "Error recovering session")
      setError("Failed to recover your session. Please sign in again.")
    } finally {
      setIsRecovering(false)
    }
  }

  // If there's an auth error, show the error UI
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen p-4 bg-gray-50 dark:bg-gray-900">
        <Card className="w-full max-w-md border-red-200 shadow-lg">
          <CardHeader className="bg-red-50 dark:bg-red-900/20">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <CardTitle className="text-red-700 dark:text-red-300">Authentication Error</CardTitle>
            </div>
            <CardDescription className="text-red-600/80 dark:text-red-400/80">{error}</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your session may have expired or there was a problem with your authentication. You can try to recover your
              session or sign in again.
            </p>
          </CardContent>
          <CardFooter className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => router.push("/sign-in")}
              className="text-gray-600 dark:text-gray-300"
            >
              <LogIn className="mr-2 h-4 w-4" />
              Sign In Again
            </Button>
            <Button
              onClick={recoverSession}
              disabled={isRecovering}
              className="bg-[#00ae98] hover:bg-[#00ae98]/90 text-white"
            >
              <RefreshCw className={`mr-2 h-4 w-4 ${isRecovering ? "animate-spin" : ""}`} />
              {isRecovering ? "Recovering..." : "Recover Session"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  // If everything is fine, render children
  return <>{children}</>
}
