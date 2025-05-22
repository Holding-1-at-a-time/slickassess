import { Navbar } from "@/components/navbar"
import { AssessmentForm } from "@/components/assessment-form"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default function NewAssessmentPage() {
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
        <h1 className="text-3xl font-bold mb-6 text-[#00ae98] neon-text">New Assessment</h1>
        <AssessmentForm />
      </main>
    </div>
  )
}
