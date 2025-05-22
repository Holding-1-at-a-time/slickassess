import { Navbar } from "@/components/navbar"
import { ClientForm } from "@/components/client-form"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default function NewClientPage() {
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
        <h1 className="text-3xl font-bold mb-6 text-[#00ae98] neon-text">Add New Client</h1>
        <ClientForm />
      </main>
    </div>
  )
}
