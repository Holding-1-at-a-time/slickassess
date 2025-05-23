/**
    * @description      : 
    * @author           : rrome
    * @group            : 
    * @created          : 22/05/2025 - 17:15:54
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 22/05/2025
    * - Author          : rrome
    * - Modification    : 
**/


import ConvexClientProvider from "@/components/convex-client-provider"
import { ThemeProvider } from "@/components/theme-provider"
import { getThemeClasses, Theme, THEME_COOKIE_NAME } from "@/lib/theme"
import { ClerkProvider } from "@clerk/nextjs"
import { Inter } from "next/font/google"
import { cookies } from "next/headers"
import type React from "react"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })



export const metadata = {
  title: "Next.js with Clerk and Convex",
  description: "A Next.js application with Clerk authentication and Convex backend",
  generator: "v0.dev",
}

export async function getServerTheme(): Promise<Theme> {
  const cookieStore = await cookies()
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME)
  const theme = themeCookie?.value
    ? JSON.parse(themeCookie.value)
    : "system";

  const themeClasses = getThemeClasses(theme)

  if (themeCookie?.value && ["light", "dark", "system"].includes(themeCookie.value)) {
    return themeCookie.value as Theme
  }

  return "system"
}



export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className="dark"
      suppressHydrationWarning
    >
      <body className={inter.className}>
        <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY!}>
          <ConvexClientProvider>
            <ThemeProvider
              enableColorScheme
              attribute="class"
              defaultTheme={"dark"}
              enableSystem
              disableTransitionOnChange
              storageKey="theme"
            >
              {children}
            </ThemeProvider>
          </ConvexClientProvider>
        </ClerkProvider>
      </body>
    </html >
  )
}
