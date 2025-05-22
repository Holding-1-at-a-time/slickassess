import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import Dashboard from "@/components/dashboard"
import { Header } from "@/components/header"

export default function Home() {
  const { userId } = auth()

  if (!userId) {
    redirect("/sign-in")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <Dashboard />
      </main>
    </div>
  )
}
