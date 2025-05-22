"use client"

import { useParams, useRouter } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { withAuth } from "@/components/with-auth"
import { CassetteLoader } from "@/components/cassette-loader"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Car, ClipboardList, Mail, MapPin, Phone, User } from "lucide-react"

function ClientDetailPage() {
  const router = useRouter()
  const { id } = useParams() as { id: string }
  const client = useQuery(api.clients.getById, { id })

  if (!client) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <CassetteLoader />
      </div>
    )
  }

  return (
    <div className="container mx-auto py-10 space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="outline" size="icon" onClick={() => router.push("/clients")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold text-[#00ae98] neon-text">Client Details</h1>
      </div>

      <Card className="shadow-md border-[#00ae98]/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-[#00ae98]" />
            {client.name}
            {client.portalAccess && <Badge className="ml-2 bg-[#00ae98]">Portal Access</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#00ae98]" />
              <span className="font-medium">Email:</span> {client.email}
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-4 w-4 text-[#00ae98]" />
              <span className="font-medium">Phone:</span> {client.phone || "—"}
            </div>
          </div>

          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-[#00ae98] mt-1" />
            <div>
              <span className="font-medium">Address:</span>
              <p className="text-gray-600 dark:text-gray-300">{client.address || "—"}</p>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap gap-3">
            <Button
              className="bg-[#00ae98] hover:bg-[#00ae98]/90"
              onClick={() => router.push(`/vehicles?clientId=${id}`)}
            >
              <Car className="mr-2 h-4 w-4" />
              View Vehicles
            </Button>
            <Button
              className="bg-[#00ae98] hover:bg-[#00ae98]/90"
              onClick={() => router.push(`/assessments?clientId=${id}`)}
            >
              <ClipboardList className="mr-2 h-4 w-4" />
              View Assessments
            </Button>
            <Button variant="outline" onClick={() => router.push(`/clients/${id}/edit`)}>
              Edit Client
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default withAuth(ClientDetailPage, ["admin", "staff"])
