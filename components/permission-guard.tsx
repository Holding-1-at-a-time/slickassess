"use client"

import type { ReactNode } from "react"
import { usePermissions } from "@/hooks/use-permissions"
import type { Permission } from "@/lib/permissions/permission-types"

interface PermissionGuardProps {
  permission: Permission
  children: ReactNode
  fallback?: ReactNode
}

export function PermissionGuard({ permission, children, fallback = null }: PermissionGuardProps) {
  const { hasPermission, loading } = usePermissions()

  if (loading) {
    return null
  }

  if (!hasPermission(permission)) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
