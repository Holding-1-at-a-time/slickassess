import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { DashboardSummary } from "@/components/dashboard-summary"
import { DashboardSummarySkeleton } from "@/components/dashboard-summary-skeleton"
import { RecentActivity } from "@/components/recent-activity"
import { RecentActivitySkeleton } from "@/components/recent-activity-skeleton"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { LeadsWidget } from "@/components/leads-widget"

export default function DashboardPage() {
  const { userId, orgId } = auth()

  if (!userId) {
    redirect("/sign-in")
  }

  if (!orgId) {
    redirect("/organization/create")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-10">
        <h1 className="text-3xl font-bold mb-6 text-[#00ae98] neon-text">Dashboard</h1>

        <Suspense fallback={<DashboardSummarySkeleton />}>
          <DashboardSummary />
        </Suspense>

        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-6 text-[#00ae98]">Recent Activity</h2>
          <Suspense fallback={<RecentActivitySkeleton />}>
            <RecentActivity />
          </Suspense>
        </div>

        <div className="mt-10">
          <h2 className="text-2xl font-bold mb-6 text-[#00ae98]">New Leads</h2>
          <Suspense fallback={<div className="animate-pulse h-48 bg-gray-200 rounded-lg"></div>}>
            <LeadsWidget />
          </Suspense>
        </div>
      </main>
    </div>
  )
}
