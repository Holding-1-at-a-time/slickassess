import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { THEME_COOKIE_NAME } from "./lib/theme"

const isPublicRoute = createRouteMatcher([
  "/",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/scan/(.*)",
  "/api/webhooks/(.*)",
  "/api/cron/(.*)",
])

export default clerkMiddleware((auth, req: NextRequest) => {
  // Handle theme detection
  const response = NextResponse.next()

  // Check if theme cookie exists
  const themeCookie = req.cookies.get(THEME_COOKIE_NAME)

  // If no theme cookie and it's a system theme request, detect from headers
  if (!themeCookie && req.headers.get("sec-ch-prefers-color-scheme")) {
    const prefersDark = req.headers.get("sec-ch-prefers-color-scheme") === "dark"
    response.cookies.set(THEME_COOKIE_NAME, prefersDark ? "dark" : "light", {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      sameSite: "lax",
    })
  }

  // Protect private routes
  if (!isPublicRoute(req)) {
    auth().protect()
  }

  return response
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
}
