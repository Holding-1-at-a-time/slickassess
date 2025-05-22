import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { AssessmentDetail } from "@/components/assessment-detail"
import { AssessmentDetailSkeleton } from "@/components/assessment-detail-skeleton"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default function AssessmentDetailPage({ params }: { params: { id: string } }) {
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
        <Suspense fallback={<AssessmentDetailSkeleton />}>
          <AssessmentDetail id={params.id} />
        </Suspense>
      </main>
    </div>
  )
}
