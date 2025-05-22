"use client"
import { ThemeProvider as NextThemesProvider } from "next-themes"
import type { ThemeProviderProps } from "next-themes"
import { THEME_COOKIE_NAME } from "@/lib/theme"

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      {...props}
      // Ensure the cookie is set when theme changes
      onThemeChange={(theme) => {
        document.cookie = `${THEME_COOKIE_NAME}=${theme}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`
      }}
    >
      {children}
    </NextThemesProvider>
  )
}
