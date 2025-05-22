"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useConvexAuth } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useQuery } from "convex/react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { SelfAssessmentForm } from "@/components/self-assessment-form"

export default function ScanLandingPage({ params }: { params: { qrSlug: string } }) {
  const { qrSlug } = params
  const { isAuthenticated } = useConvexAuth()
  const tenant = useQuery(api.tenants.getByQrSlug, { qrSlug })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (tenant !== undefined) {
      setLoading(false)
    }
  }, [tenant])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#00AE98]" />
        <p className="mt-4 text-lg">Loading...</p>
      </div>
    )
  }

  if (!tenant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle className="text-2xl text-center text-red-500">Invalid QR Code</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-center">
              This QR code is invalid or has expired. Please contact the service provider for assistance.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Use tenant branding if available
  const primaryColor = tenant.branding?.primaryColor || "#00AE98"

  return (
    <div
      className="min-h-screen flex flex-col"
      style={
        {
          "--primary-color": primaryColor,
        } as React.CSSProperties
      }
    >
      <header className="bg-[var(--primary-color)] text-white p-4 shadow-md">
        <div className="container mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">{tenant.name}</h1>
          {tenant.branding?.logo && (
            <img src={tenant.branding.logo || "/placeholder.svg"} alt="Logo" className="h-10" />
          )}
        </div>
      </header>

      <main className="flex-1 container mx-auto py-8 px-4">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Vehicle Self-Assessment</CardTitle>
            <CardDescription>
              Complete this form to receive a professional assessment and estimate for your vehicle.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SelfAssessmentForm tenantId={tenant._id} />
          </CardContent>
        </Card>
      </main>

      <footer className="bg-gray-100 p-4 text-center text-sm text-gray-600">
        <p>Powered by Vehicle Service SaaS</p>
      </footer>
    </div>
  )
}
