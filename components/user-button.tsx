"use client"

import { UserButton as ClerkUserButton } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import { useTheme } from "next-themes"

export function UserButton() {
  const { resolvedTheme } = useTheme()
  const isDarkMode = resolvedTheme === "dark"

  return (
    <ClerkUserButton
      appearance={{
        baseTheme: isDarkMode ? dark : undefined,
        elements: {
          avatarBox: "h-10 w-10 border-2 border-[#00ae98]",
          userButtonPopoverCard: "shadow-neon",
          userButtonPopoverActionButton: "text-[#00ae98] hover:text-[#00ae98]/80",
          userButtonPopoverActionButtonText: "text-[#00ae98]",
          userButtonPopoverFooter: "border-t border-[#707070]",
        },
      }}
    />
  )
}
