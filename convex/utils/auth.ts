import type { QueryCtx, MutationCtx, ActionCtx } from "../_generated/server"

// Type for any Convex context that has auth
type AuthContext = QueryCtx | MutationCtx | ActionCtx

// Function to require and return the organization ID
export async function requireOrgId(ctx: AuthContext): Promise<string> {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new Error("Not authenticated")
  }

  // Get the organization ID from the token
  const orgId = identity.tokenIdentifier.split("|")[0]

  if (!orgId) {
    throw new Error("No organization ID found in token")
  }

  return orgId
}

// Function to require authentication and return user ID and org ID
export async function requireAuth(ctx: AuthContext): Promise<{ userId: string; orgId: string }> {
  const identity = await ctx.auth.getUserIdentity()

  if (!identity) {
    throw new Error("Not authenticated")
  }

  const userId = identity.subject
  const orgId = identity.tokenIdentifier.split("|")[0]

  if (!userId || !orgId) {
    throw new Error("Invalid authentication token")
  }

  return { userId, orgId }
}
