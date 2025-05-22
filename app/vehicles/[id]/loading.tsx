import { Navbar } from "@/components/navbar"
import { CassetteLoader } from "@/components/cassette-loader"

export default function VehicleDetailLoading() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 flex items-center justify-center">
        <CassetteLoader />
      </main>
    </div>
  )
}
