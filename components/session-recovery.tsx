"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { toast } from "@/components/ui/use-toast"

export function SessionRecovery() {
  const { isSignedIn, isLoaded, signOut } = useAuth()
  const [isRecovering, setIsRecovering] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Check for stored session data in localStorage
    if (isLoaded && !isSignedIn) {
      const lastPath = localStorage.getItem("lastPath")
      const lastActivity = localStorage.getItem("lastActivity")

      // If we have a stored path and the last activity was within the last hour
      if (lastPath && lastActivity) {
        const lastActivityTime = Number.parseInt(lastActivity, 10)
        const now = Date.now()
        const oneHour = 60 * 60 * 1000

        if (now - lastActivityTime < oneHour) {
          toast({
            title: "Session expired",
            description: "Would you like to sign in again and continue where you left off?",
            action: (
              <Button
                onClick={() => {
                  router.push(`/sign-in?redirect=${encodeURIComponent(lastPath)}`)
                }}
              >
                Sign in
              </Button>
            ),
          })
        }
      }
    }
  }, [isLoaded, isSignedIn, router])

  // Store the current path and activity time
  useEffect(() => {
    if (isSignedIn) {
      const storePath = () => {
        localStorage.setItem("lastPath", window.location.pathname)
        localStorage.setItem("lastActivity", Date.now().toString())
      }

      // Store immediately and then every minute
      storePath()
      const interval = setInterval(storePath, 60 * 1000)

      return () => clearInterval(interval)
    }
  }, [isSignedIn])

  return null
}
