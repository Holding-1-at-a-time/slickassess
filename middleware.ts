import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"

// Define protected routes that require authentication
const isProtectedRoute = createRouteMatcher(["/dashboard(.*)", "/organization(.*)", "/api(.*)", "/trpc(.*)"])

// Define routes that require admin role
const isAdminRoute = createRouteMatcher(["/dashboard/admin(.*)", "/organization/settings(.*)"])

export default clerkMiddleware(async (auth, req) => {
  const { userId, orgId, orgRole } = auth

  // Check if the route is protected
  if (isProtectedRoute(req)) {
    // This will automatically redirect to sign-in if the user is not signed in
    await auth.protect()
  }

  // Check if the route requires admin role
  if (isAdminRoute(req)) {
    await auth.protect({
      role: "org:admin",
    })
  }
})

// Configure which paths the middleware should run on
export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API/trpc routes
    "/(api|trpc)(.*)",
  ],
}
