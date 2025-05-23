"use client"

import { useUser, useAuth, useOrganization } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { CassetteLoader } from "./cassette-loader"
import { SectionErrorBoundary } from "@/components/error-boundary"
import { DashboardSummary } from "@/components/dashboard-summary"
import { RecentActivity } from "@/components/recent-activity"
import { LeadsWidget } from "@/components/leads-widget"
import { PredictiveAnalyticsDashboard } from "@/components/predictive-analytics-dashboard"

export default function Dashboard() {
  const router = useRouter()
  const { user } = useUser()
  const { isSignedIn, signOut } = useAuth()
  const { organization } = useOrganization()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return <CassetteLoader />
  }

  if (!isSignedIn || !user) {
    return null
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/sign-in")
  }

  const handleManageOrg = () => {
    router.push("/organization")
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <SectionErrorBoundary section="Dashboard Summary">
        <DashboardSummary />
      </SectionErrorBoundary>

      <SectionErrorBoundary section="Recent Activity">
        <RecentActivity />
      </SectionErrorBoundary>

      <SectionErrorBoundary section="Leads">
        <LeadsWidget />
      </SectionErrorBoundary>

      <div className="col-span-1 md:col-span-2 lg:col-span-3">
        <SectionErrorBoundary section="Predictive Analytics">
          <PredictiveAnalyticsDashboard />
        </SectionErrorBoundary>
      </div>
    </div>
  )
}
