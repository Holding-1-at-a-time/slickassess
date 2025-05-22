"use client"

import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth } from "@clerk/nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { CassetteLoader } from "@/components/cassette-loader"
import { handleError } from "@/lib/error-handling"
import { Users, Car, FileText, ArrowRight } from "lucide-react"
import Link from "next/link"

export function DashboardSummary() {
  const { getToken } = useAuth()
  const [token, setToken] = useState<string | null>(null)

  // Fetch the token
  useEffect(() => {
    async function fetchToken() {
      try {
        const newToken = await getToken({ template: "convex" })
        setToken(newToken)
      } catch (error) {
        handleError(error)
      }
    }

    fetchToken()
  }, [getToken])

  // Fetch data using the token
  const clients = useQuery(
    api.clients.getClients,
    {},
    {
      additionalHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )

  const vehicles = useQuery(
    api.vehicles.getVehicles,
    {},
    {
      additionalHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )

  const assessments = useQuery(
    api.assessments.getAssessments,
    {},
    {
      additionalHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )

  const pendingAssessments = useQuery(
    api.assessments.getAssessments,
    { status: "pending" },
    {
      additionalHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )

  if (
    clients === undefined ||
    vehicles === undefined ||
    assessments === undefined ||
    pendingAssessments === undefined
  ) {
    return <CassetteLoader />
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      <Card className="shadow-neon">
        <CardHeader className="pb-2">
          <CardTitle className="text-[#00ae98] flex items-center">
            <Users className="mr-2 h-5 w-5" />
            Clients
          </CardTitle>
          <CardDescription className="text-secondary">Total clients</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{clients.length}</div>
          <div className="mt-4">
            <Link href="/clients">
              <Button variant="outline" className="w-full border-[#00ae98] text-[#00ae98] hover:bg-[#00ae98]/10">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-neon">
        <CardHeader className="pb-2">
          <CardTitle className="text-[#00ae98] flex items-center">
            <Car className="mr-2 h-5 w-5" />
            Vehicles
          </CardTitle>
          <CardDescription className="text-secondary">Total vehicles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{vehicles.length}</div>
          <div className="mt-4">
            <Link href="/vehicles">
              <Button variant="outline" className="w-full border-[#00ae98] text-[#00ae98] hover:bg-[#00ae98]/10">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-neon">
        <CardHeader className="pb-2">
          <CardTitle className="text-[#00ae98] flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Assessments
          </CardTitle>
          <CardDescription className="text-secondary">Total assessments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{assessments.length}</div>
          <div className="mt-4">
            <Link href="/assessments">
              <Button variant="outline" className="w-full border-[#00ae98] text-[#00ae98] hover:bg-[#00ae98]/10">
                View All
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-neon">
        <CardHeader className="pb-2">
          <CardTitle className="text-amber-500 flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Pending
          </CardTitle>
          <CardDescription className="text-secondary">Pending assessments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{pendingAssessments.length}</div>
          <div className="mt-4">
            <Link href="/assessments?status=pending">
              <Button variant="outline" className="w-full border-amber-500 text-amber-500 hover:bg-amber-500/10">
                View Pending
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
