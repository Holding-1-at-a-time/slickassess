/**
    * @description      : 
    * @author           : rrome
    * @group            : 
    * @created          : 22/05/2025 - 17:08:56
    * 
    * MODIFICATION LOG
    * - Version         : 1.0.0
    * - Date            : 22/05/2025
    * - Author          : rrome
    * - Modification    : 
**/
"use client"

import { SignIn } from "@clerk/nextjs"
import { dark } from "@clerk/themes"
import { useTheme } from "next-themes"
import { CassetteLoader } from "@/components/cassette-loader"
import { useState, useEffect } from "react"

export default function SignInPage() {
  const { resolvedTheme } = useTheme()
  const isDarkMode = resolvedTheme === "dark"
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <CassetteLoader />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <SignIn
        path="/sign-in"
        routing="path"
        signUpUrl="/sign-up"
        appearance={{
          baseTheme: isDarkMode ? dark : undefined,
          elements: {
            formButtonPrimary: "bg-[#00ae98] hover:bg-[#00ae98]/90 text-white",
            card: "shadow-neon",
            headerTitle: "text-[#00ae98]",
            headerSubtitle: "text-secondary",
            socialButtonsBlockButton: "border-secondary text-secondary",
            socialButtonsBlockButtonText: "text-secondary",
            formFieldLabel: "text-[#00ae98]",
            formFieldInput: "border-secondary focus:border-[#00ae98]",
            footerActionText: "text-secondary",
            footerActionLink: "text-[#00ae98] hover:text-[#00ae98]/80",
          },
        }}
      />
    </div>
  )
}
