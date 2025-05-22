"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { Loader2, AlertTriangle } from "lucide-react"
import SelfAssessmentForm from "@/components/self-assessment-form"

// Initialize Convex HTTP client for public access
const convexClient = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL || "")

// Helper function to get client IP (this is a simplified version)
async function getClientIdentifier() {
  try {
    // Try to get IP from a service like ipify
    const response = await fetch("https://api.ipify.org?format=json")
    const data = await response.json()
    return data.ip
  } catch (error) {
    // Fallback to a browser fingerprint or random ID
    return `browser-${Math.random().toString(36).substring(2, 15)}`
  }
}

export default function ScanPage() {
  const { qrSlug } = useParams() as { qrSlug: string }
  const [tenant, setTenant] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [clientIdentifier, setClientIdentifier] = useState<string>("")

  useEffect(() => {
    async function initialize() {
      // Get client identifier for rate limiting
      const identifier = await getClientIdentifier()
      setClientIdentifier(identifier)

      try {
        // Apply rate limiting for QR code scan
        try {
          await convexClient.mutation(api.utils.rateLimiter.applyRateLimit, {
            identifier,
            action: "qrScan",
            config: {
              maxRequests: 30,
              windowMs: 60 * 1000, // 1 minute
              message: "Too many QR code scans. Please try again later.",
            },
          })
        } catch (error: any) {
          setError(error.message || "Rate limit exceeded. Please try again later.")
          setLoading(false)
          return
        }

        // Fetch tenant data
        const result = await convexClient.query(api.tenants.getByQrSlug, { qrSlug })

        if (!result) {
          setError(
            "This QR code is invalid or has expired. Please contact the service provider for an updated QR code.",
          )
        } else {
          setTenant(result)
        }
      } catch (err) {
        console.error("Error fetching tenant:", err)
        setError("Something went wrong. Please try again later.")
      } finally {
        setLoading(false)
      }
    }

    if (qrSlug) {
      initialize()
    }
  }, [qrSlug])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Loader2 className="h-8 w-8 animate-spin text-[#00AE98] mb-4" />
        <p className="text-center text-gray-600">Loading...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-6 rounded-lg shadow-lg">
          <div className="flex items-center justify-center text-amber-600 mb-4">
            <AlertTriangle className="h-12 w-12" />
          </div>
          <h1 className="text-xl font-bold text-center mb-4">Error</h1>
          <p className="text-center text-gray-600 mb-6">{error}</p>
          <div className="text-center text-sm text-gray-500">
            <p>If you believe this is an error, please contact the service provider.</p>
          </div>
        </div>
      </div>
    )
  }

  if (!tenant) {
    return null
  }

  // Use tenant branding if available
  const primaryColor = tenant.branding?.primaryColor || "#00AE98"
  const secondaryColor = tenant.branding?.secondaryColor || "#707070"

  return (
    <div
      className="min-h-screen flex flex-col"
      style={
        {
          "--primary-color": primaryColor,
          "--secondary-color": secondaryColor,
        } as React.CSSProperties
      }
    >
      <header className="bg-[var(--primary-color)] text-white p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">{tenant.name}</h1>
          {tenant.branding?.logo && (
            <img src={tenant.branding.logo || "/placeholder.svg"} alt={`${tenant.name} logo`} className="h-10 w-auto" />
          )}
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-6 max-w-2xl">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6 text-center text-[var(--primary-color)]">Vehicle Self-Assessment</h2>

          <p className="mb-6 text-center text-gray-600">
            Complete this form to submit details about your vehicle. Our team will review your information and get back
            to you with an assessment.
          </p>

          <SelfAssessmentForm tenantId={tenant._id} clientIdentifier={clientIdentifier} />
        </div>
      </main>

      <footer className="bg-gray-100 p-4 text-center text-sm text-gray-500">
        <p>
          © {new Date().getFullYear()} {tenant.name}. All rights reserved.
        </p>
      </footer>
    </div>
  )
}
