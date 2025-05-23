import type { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server"
import { ConvexError } from "convex/server"
import { type Permission, type Role, hasPermission } from "@/lib/permissions/permission-types"

// Type for any Convex context that has auth
type AuthContext = QueryCtx | MutationCtx | ActionCtx

// Function to require and return the organization ID
export async function requireOrgId(ctx: AuthContext): Promise<string> {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new ConvexError({
      code: 401,
      message: "Not authenticated",
    })
  }

  // Get the organization ID from the token
  const orgId = identity.tokenIdentifier.split("|")[0]

  if (!orgId) {
    throw new ConvexError({
      code: 400,
      message: "No organization ID found in token",
    })
  }

  return orgId
}

// Function to require authentication and return user ID and org ID
export async function requireAuth(ctx: AuthContext): Promise<{ userId: string; orgId: string; role: Role }> {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new ConvexError({
      code: 401,
      message: "Not authenticated",
    })
  }

  const userId = identity.subject
  const orgId = identity.tokenIdentifier.split("|")[0]
  const role = (identity.tokenIdentifier.split("|")[1] as Role) || "viewer"

  if (!userId || !orgId) {
    throw new ConvexError({
      code: 400,
      message: "Invalid authentication token",
    })
  }

  return { userId, orgId, role }
}

// Function to require a specific role
export async function requireOrgRole(
  ctx: AuthContext,
  requiredRoles: Role | Role[],
): Promise<{ userId: string; orgId: string; role: Role }> {
  const { userId, orgId, role } = await requireAuth(ctx)

  const roles = Array.isArray(requiredRoles) ? requiredRoles : [requiredRoles]

  if (!roles.includes(role) && role !== "owner") {
    throw new ConvexError({
      code: 403,
      message: `Access denied. Required role: ${roles.join(" or ")}`,
    })
  }

  return { userId, orgId, role }
}

// Function to require a specific permission
export async function requirePermission(
  ctx: AuthContext,
  requiredPermission: Permission,
): Promise<{ userId: string; orgId: string; role: Role }> {
  const { userId, orgId, role } = await requireAuth(ctx)

  if (role === "owner") {
    // Owners have all permissions
    return { userId, orgId, role }
  }

  if (!hasPermission(role, requiredPermission)) {
    throw new ConvexError({
      code: 403,
      message: `Access denied. Required permission: ${requiredPermission}`,
    })
  }

  return { userId, orgId, role }
}

// Function to check if user has a specific permission
export async function checkPermission(ctx: AuthContext, permission: Permission): Promise<boolean> {
  try {
    const { role } = await requireAuth(ctx)
    return role === "owner" || hasPermission(role, permission)
  } catch (error) {
    return false
  }
}
