"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth, useUser } from "@clerk/nextjs"
import { toast } from "@/components/ui/use-toast"

export function AuthErrorHandler() {
  const { isLoaded, isSignedIn, signOut } = useAuth()
  const { user, isLoaded: isUserLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (!isLoaded || !isUserLoaded) return

    // Handle session expiration
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Check if the session is still valid when the user returns to the tab
        if (isSignedIn && user) {
          user.reload().catch((error) => {
            console.error("Failed to reload user:", error)
            // If reloading fails, sign out and redirect to login
            signOut().then(() => {
              toast({
                title: "Session expired",
                description: "Please sign in again to continue.",
                variant: "destructive",
              })
              router.push("/sign-in")
            })
          })
        }
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    // Handle network status changes
    const handleOnline = () => {
      if (isSignedIn && user) {
        user.reload().catch((error) => {
          console.error("Failed to reload user after coming online:", error)
        })
      }
    }

    window.addEventListener("online", handleOnline)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      window.removeEventListener("online", handleOnline)
    }
  }, [isLoaded, isSignedIn, user, isUserLoaded, signOut, router])

  return null
}
