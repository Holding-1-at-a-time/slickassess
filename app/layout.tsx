import type React from "react"
import { ClerkProvider } from "@clerk/nextjs"
import { Inter } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import ConvexClientProvider from "@/components/convex-client-provider"
import { getServerTheme, getThemeClasses } from "@/lib/theme"

const inter = Inter({ subsets: ["latin"] })

export const metadata = {
  title: "Next.js with Clerk and Convex",
  description: "A Next.js application with Clerk authentication and Convex backend",
  generator: "v0.dev",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const theme = getServerTheme()
  const themeClasses = getThemeClasses(theme)

  return (
    <html
      lang="en"
      className={themeClasses}
      style={{ colorScheme: getThemeClasses(theme) === "dark" ? "dark" : "light" }}
    >
      <body className={inter.className}>
        <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
          <ConvexClientProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme={theme}
              enableSystem
              disableTransitionOnChange
              storageKey="theme"
            >
              {children}
            </ThemeProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html>
  )
}
