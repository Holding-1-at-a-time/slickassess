"use server"

import { cookies } from "next/headers"
import { THEME_COOKIE_NAME, type Theme } from "@/lib/theme"

export async function setThemeCookie(theme: Theme) {
  const cookieStore = cookies()

  cookieStore.set(THEME_COOKIE_NAME, theme, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  })
}
