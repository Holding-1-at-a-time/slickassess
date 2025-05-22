"use client"

import { UserProfile } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import { useTheme } from "next-themes"
import { Navbar } from "@/components/navbar"
import { useState, useEffect } from "react"
import { CassetteLoader } from "@/components/cassette-loader"

export default function ProfilePage() {
  const { resolvedTheme } = useTheme()
  const isDarkMode = resolvedTheme === "dark"
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <CassetteLoader />
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-10 flex justify-center">
        <UserProfile
          path="/profile"
          routing="path"
          appearance={{
            baseTheme: isDarkMode ? dark : undefined,
            elements: {
              rootBox: "mx-auto w-full max-w-3xl",
              card: "shadow-neon",
              navbar: "hidden",
              headerTitle: "text-[#00ae98]",
              headerSubtitle: "text-secondary",
              formButtonPrimary: "bg-[#00ae98] hover:bg-[#00ae98]/90 text-white",
              formFieldLabel: "text-[#00ae98]",
              formFieldInput: "border-secondary focus:border-[#00ae98]",
              profileSectionTitle: "text-[#00ae98]",
              profileSectionPrimaryButton: "bg-[#00ae98] hover:bg-[#00ae98]/90 text-white",
              profileSectionSecondaryButton: "border-[#00ae98] text-[#00ae98]",
            },
          }}
        />
      </main>
    </div>
  )
}
