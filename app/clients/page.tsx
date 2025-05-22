import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { ClientList } from "@/components/client-list"
import { ClientListSkeleton } from "@/components/client-list-skeleton"
import { ClientFilters } from "@/components/client-filters"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"

export default function ClientsPage() {
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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-[#00ae98] neon-text">Clients</h1>
          <Link href="/clients/new">
            <Button className="bg-[#00ae98] hover:bg-[#00ae98]/90 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Add Client
            </Button>
          </Link>
        </div>

        <ClientFilters />

        <Suspense fallback={<ClientListSkeleton />}>
          <ClientList />
        </Suspense>
      </main>
    </div>
  )
}
