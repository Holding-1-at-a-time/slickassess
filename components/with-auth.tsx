"use client"

import type React from "react"

import { type ReactNode, useEffect, useState } from "react"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { CassetteLoader } from "@/components/cassette-loader"

type WithAuthProps = {
  children?: ReactNode
}

/**
 * Higher-order component that wraps a component with authentication and role-based access control
 * @param Component The component to wrap
 * @param requiredRoles Optional array of roles that are allowed to access the component
 * @returns A new component that includes authentication and role checks
 */
export function withAuth<P extends object>(
  Component: React.ComponentType<P>,
  requiredRoles?: string[],
): React.FC<P & WithAuthProps> {
  return function WithAuth(props: P & WithAuthProps) {
    const { isLoaded, userId, isSignedIn } = useAuth()
    const { organization, isLoaded: isOrgLoaded } = useOrganization()
    const [isAuthorized, setIsAuthorized] = useState(false)
    const router = useRouter()

    useEffect(() => {
      if (!isLoaded || !isOrgLoaded) return

      // If user is not signed in, redirect to sign-in page
      if (!isSignedIn || !userId) {
        router.push("/sign-in")
        return
      }

      // If no organization is selected, redirect to organization creation page
      if (!organization) {
        router.push("/organization/create")
        return
      }

      // Check role requirements if specified
      if (requiredRoles && requiredRoles.length > 0) {
        const userRole = organization.membership?.role

        // If user doesn't have a role or their role is not in the required roles list
        if (!userRole || !requiredRoles.includes(userRole)) {
          // Redirect to dashboard as they don't have permission
          router.push("/dashboard")
          return
        }
      }

      // User is authenticated and authorized
      setIsAuthorized(true)
    }, [isLoaded, isOrgLoaded, isSignedIn, userId, organization, router, requiredRoles])

    // Show loading state while checking authentication and authorization
    if (!isLoaded || !isOrgLoaded || !isAuthorized) {
      return (
        <div className="flex min-h-screen items-center justify-center">
          <CassetteLoader />
        </div>
      )
    }

    // Render the wrapped component with all props
    return <Component {...props} />
  }
}
