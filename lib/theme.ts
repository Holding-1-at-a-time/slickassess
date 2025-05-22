import { cookies } from "next/headers"

export const THEME_COOKIE_NAME = "theme"

export type Theme = "light" | "dark" | "system"

export function getServerTheme(): Theme {
  const cookieStore = cookies()
  const themeCookie = cookieStore.get(THEME_COOKIE_NAME)

  if (themeCookie?.value && ["light", "dark", "system"].includes(themeCookie.value)) {
    return themeCookie.value as Theme
  }

  return "system"
}

export function getResolvedTheme(theme: Theme): "light" | "dark" {
  if (theme === "system") {
    // Default to light for server-side rendering
    // The client will handle system preference detection
    return "light"
  }
  return theme
}

export function getThemeClasses(theme: Theme): string {
  const resolvedTheme = getResolvedTheme(theme)
  return resolvedTheme === "dark" ? "dark" : ""
}
