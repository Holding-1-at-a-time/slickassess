"use client"

import type React from "react"

import { ConvexProvider } from "convex/react"
import { ClerkProvider } from "@clerk/nextjs"
import { convex } from "@/lib/convex-client"
import { ThemeProvider } from "@/components/theme-provider"

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
      <ConvexProvider client={convex}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
          {children}
        </ThemeProvider>
      </ConvexProvider>
    </ClerkProvider>
  )
}
