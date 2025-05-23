import { authMiddleware, clerkClient } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import { Permission, type Role, hasPermission } from "./lib/permissions/permission-types"

// Map of routes to required permissions
const ROUTE_PERMISSIONS: Record<string, Permission> = {
  "/clients": Permission.VIEW_CLIENTS,
  "/clients/new": Permission.CREATE_CLIENTS,
  "/vehicles": Permission.VIEW_VEHICLES,
  "/vehicles/new": Permission.CREATE_VEHICLES,
  "/assessments": Permission.VIEW_ASSESSMENTS,
  "/assessments/new": Permission.CREATE_ASSESSMENTS,
  "/reports": Permission.VIEW_REPORTS,
  "/analytics": Permission.VIEW_ANALYTICS,
  "/settings/billing": Permission.VIEW_BILLING,
  "/organization/members": Permission.INVITE_MEMBERS,
  "/admin": Permission.MANAGE_ORGANIZATION,
}

export default authMiddleware({
  publicRoutes: ["/", "/api/webhooks(.*)", "/reports/shared/(.*)", "/reports/sign/(.*)", "/scan/(.*)"],
  beforeAuth: (req) => {
    // Handle CORS preflight requests
    if (req.method === "OPTIONS") {
      return NextResponse.next()
    }
  },
  afterAuth: async (auth, req) => {
    // If the user is authenticated and trying to access a protected route
    if (auth.userId && auth.orgId) {
      const path = req.nextUrl.pathname

      // Check if the route requires specific permissions
      const requiredPermission = Object.entries(ROUTE_PERMISSIONS).find(([route, _]) => {
        if (route.endsWith("(.*)")) {
          const baseRoute = route.replace("(.*)", "")
          return path.startsWith(baseRoute)
        }
        return path === route || path.startsWith(`${route}/`)
      })?.[1]

      if (requiredPermission) {
        try {
          // Get the user's role in the organization
          const membership = await clerkClient.organizations.getOrganizationMembership({
            organizationId: auth.orgId,
            userId: auth.userId,
          })

          let role: Role = "viewer" // Default role

          if (membership.role === "org:admin") {
            role = "admin"
          } else if (membership.publicMetadata?.role) {
            role = membership.publicMetadata.role as Role
          }

          // Check if the user has the required permission
          if (!hasPermission(role, requiredPermission) && role !== "owner") {
            // Redirect to dashboard if permission check fails
            return NextResponse.redirect(new URL("/dashboard", req.url))
          }
        } catch (error) {
          console.error("Error checking permissions:", error)
          // Redirect to dashboard on error
          return NextResponse.redirect(new URL("/dashboard", req.url))
        }
      }
    }

    return NextResponse.next()
  },
})

export const config = {
  matcher: ["/((?!.*\\..*|_next).*)", "/(api|trpc)(.*)"],
}
