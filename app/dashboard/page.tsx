"use client"

import { useOrganization } from "@clerk/nextjs"
import { redirect } from "next/navigation"
import { Dashboard } from "@/components/dashboard"
import { DashboardSummary } from "@/components/dashboard-summary"
import { RecentActivity } from "@/components/recent-activity"
import { LeadsWidget } from "@/components/leads-widget"
import { withAuth } from "@/components/with-auth"

function DashboardPage() {
  const { organization, isLoaded } = useOrganization()

  if (isLoaded && !organization) {
    redirect("/organization/create")
  }

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Dashboard</h2>
      </div>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        <DashboardSummary className="col-span-4" />
        <RecentActivity className="col-span-3" />
      </div>
      <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-7">
        <div className="col-span-4">
          <h3 className="text-xl font-semibold mb-4">New Leads</h3>
          <LeadsWidget />
        </div>
        <div className="col-span-3">
          <Dashboard />
        </div>
      </div>
    </div>
  )
}

export default withAuth(DashboardPage)
