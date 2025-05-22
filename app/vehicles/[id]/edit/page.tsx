import { Suspense } from "react"
import { Navbar } from "@/components/navbar"
import { VehicleForm } from "@/components/vehicle-form"
import { VehicleEditSkeleton } from "@/components/vehicle-edit-skeleton"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { ConvexReactClient } from "convex/react"
import { api } from "@/convex/_generated/api"

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export default async function EditVehiclePage({ params }: { params: { id: string } }) {
  const { userId, orgId, getToken } = auth()

  if (!userId) {
    redirect("/sign-in")
  }

  if (!orgId) {
    redirect("/organization/create")
  }

  // Get the JWT token for Convex
  const token = await getToken({ template: "convex" })

  // Fetch the vehicle data server-side
  let vehicle
  try {
    vehicle = await convex.query(
      api.vehicles.getVehicle,
      { vehicleId: params.id },
      { headers: { Authorization: `Bearer ${token}` } },
    )
  } catch (error) {
    console.error("Error fetching vehicle:", error)
  }

  if (!vehicle) {
    redirect("/vehicles")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-10">
        <h1 className="text-3xl font-bold mb-6 text-[#00ae98] neon-text">Edit Vehicle</h1>
        <Suspense fallback={<VehicleEditSkeleton />}>
          <VehicleForm vehicle={vehicle} />
        </Suspense>
      </main>
    </div>
  )
}
