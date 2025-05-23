"use client"

import type React from "react"

import { createContext, useContext, useEffect, useState } from "react"
import { useToast } from "@/components/ui/use-toast"

interface CsrfContextType {
  csrfToken: string | null
  loading: boolean
  refreshToken: () => Promise<void>
}

const CsrfContext = createContext<CsrfContextType>({
  csrfToken: null,
  loading: true,
  refreshToken: async () => {},
})

export function useCsrf() {
  return useContext(CsrfContext)
}

export function CsrfProvider({ children }: { children: React.ReactNode }) {
  const [csrfToken, setCsrfToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const fetchCsrfToken = async () => {
    try {
      const response = await fetch("/api/csrf")

      if (!response.ok) {
        throw new Error("Failed to fetch CSRF token")
      }

      const data = await response.json()
      setCsrfToken(data.csrfToken)
    } catch (error) {
      console.error("Error fetching CSRF token:", error)
      toast({
        title: "Security Error",
        description: "Failed to initialize security features. Please refresh the page.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCsrfToken()
  }, [])

  const refreshToken = async () => {
    setLoading(true)
    await fetchCsrfToken()
  }

  return <CsrfContext.Provider value={{ csrfToken, loading, refreshToken }}>{children}</CsrfContext.Provider>
}

// Custom hook for making CSRF-protected fetch requests
export function useCsrfFetch() {
  const { csrfToken, loading, refreshToken } = useCsrf()

  const fetchWithCsrf = async (url: string, options: RequestInit = {}) => {
    if (loading) {
      throw new Error("CSRF token is still loading")
    }

    if (!csrfToken) {
      await refreshToken()
      throw new Error("CSRF token not available")
    }

    const headers = new Headers(options.headers || {})
    headers.set("x-csrf-token", csrfToken)

    return fetch(url, {
      ...options,
      headers,
    })
  }

  return { fetchWithCsrf, csrfToken, csrfLoading: loading }
}
