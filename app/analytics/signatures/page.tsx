"use client"

import { SignatureAnalyticsDashboard } from "@/components/signature-analytics-dashboard"
import { withAuth } from "@/components/with-auth"

function SignatureAnalyticsPage() {
  return <SignatureAnalyticsDashboard />
}

export default withAuth(SignatureAnalyticsPage, ["admin", "manager"])
