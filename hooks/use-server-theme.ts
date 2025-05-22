"use client"

import { useTheme } from "next-themes"
import { useEffect } from "react"
import { setThemeCookie } from "@/app/actions/theme"
import type { Theme } from "@/lib/theme"

export function useServerTheme() {
  const { theme, setTheme } = useTheme()

  const updateTheme = async (newTheme: Theme) => {
    setTheme(newTheme)
    await setThemeCookie(newTheme)
  }

  // Sync theme changes with server
  useEffect(() => {
    if (theme) {
      setThemeCookie(theme as Theme)
    }
  }, [theme])

  return {
    theme,
    setTheme: updateTheme,
  }
}
