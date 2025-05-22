import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { AssessmentForm } from "@/components/assessment-form"
import { AssessmentEditSkeleton } from "@/components/assessment-edit-skeleton"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { ConvexReactClient } from "convex/react"
import { api } from "@/convex/_generated/api"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export default async function EditAssessmentPage({ params }: { params: { id: string } }) {
  const { userId, orgId, getToken } = auth()

  if (!userId) {
    redirect("/sign-in")
  }

  if (!orgId) {
    redirect("/organization/create")
  }

  // Get the JWT token for Convex
  const token = await getToken({ template: "convex" })

  // Fetch the assessment data server-side
  let assessment
  try {
    assessment = await convex.query(
      api.assessments.getAssessment,
      { assessmentId: params.id },
      { headers: { Authorization: `Bearer ${token}` } },
    )
  } catch (error) {
    console.error("Error fetching assessment:", error)
  }

  if (!assessment) {
    redirect("/assessments")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-10">
        <h1 className="text-3xl font-bold mb-6 text-[#00ae98] neon-text">Edit Assessment</h1>
        <Suspense fallback={<AssessmentEditSkeleton />}>
          <AssessmentForm assessment={assessment} />
        </Suspense>
      </main>
    </div>
  )
}
