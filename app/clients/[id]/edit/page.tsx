import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { ClientEditForm } from "@/components/client-edit-form"
import { ClientEditSkeleton } from "@/components/client-edit-skeleton"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default function ClientEditPage({ params }: { params: { id: string } }) {
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
        <h1 className="text-3xl font-bold mb-6 text-[#00ae98] neon-text">Edit Client</h1>
        <Suspense fallback={<ClientEditSkeleton />}>
          <ClientEditForm id={params.id} />
        </Suspense>
      </main>
    </div>
  )
}
