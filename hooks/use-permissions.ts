"use client"

import { useOrganization, useUser } from "@clerk/nextjs"
import { useEffect, useState } from "react"
import { type Permission, type Role, hasPermission } from "@/lib/permissions/permission-types"

export function usePermissions() {
  const { organization } = useOrganization()
  const { user } = useUser()
  const [userRole, setUserRole] = useState<Role>("viewer")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (organization && user) {
      // Get the user's membership in the organization
      const membership = organization.memberships?.find((m) => m.publicUserData?.userId === user.id)

      // Set the role based on the membership
      if (membership) {
        if (membership.role === "org:admin") {
          setUserRole("admin")
        } else if (membership.role === "org:member") {
          // Check for custom roles in public metadata
          const customRole = membership.publicMetadata?.role as Role
          if (customRole && ["manager", "assessor", "viewer", "client"].includes(customRole)) {
            setUserRole(customRole)
          } else {
            setUserRole("viewer") // Default role
          }
        }
      }

      setLoading(false)
    }
  }, [organization, user])

  // Check if the user has a specific permission
  const hasPermissionCheck = (permission: Permission): boolean => {
    if (!organization || !user || loading) return false

    // Organization admins have all permissions
    if (organization.membership?.role === "org:admin") return true

    return hasPermission(userRole, permission)
  }

  return {
    role: userRole,
    loading,
    hasPermission: hasPermissionCheck,
    isAdmin: userRole === "admin" || userRole === "owner",
    isManager: userRole === "manager" || userRole === "admin" || userRole === "owner",
    isAssessor: userRole === "assessor" || userRole === "manager" || userRole === "admin" || userRole === "owner",
  }
}
