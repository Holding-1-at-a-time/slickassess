"use client"

import { useState } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useOrganizationContext } from "@/components/organization-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { CassetteLoader } from "@/components/cassette-loader"

export default function TestIsolationPage() {
  const { currentOrganization, organizations, switchOrganization } = useOrganizationContext()
  const vehicles = useQuery(api.vehicles.getVehicles)
  const assessments = useQuery(api.assessments.getAssessments)
  const [isLoading, setIsLoading] = useState(false)

  const handleSwitchOrg = async (orgId: string) => {
    setIsLoading(true)
    await switchOrganization(orgId)
    setIsLoading(false)
  }

  if (isLoading) {
    return <CassetteLoader />
  }

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-6 text-[#00ae98] neon-text">Data Isolation Test</h1>

      <Card className="mb-8 shadow-neon">
        <CardHeader>
          <CardTitle className="text-[#00ae98]">Current Organization</CardTitle>
          <CardDescription className="text-secondary">
            {currentOrganization ? currentOrganization.name : "No organization selected"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentOrganization && (
            <div className="space-y-2">
              <p>
                <span className="font-semibold">ID:</span> {currentOrganization.id}
              </p>
              <p>
                <span className="font-semibold">Role:</span> {currentOrganization.role}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 mb-8">
        <Card className="shadow-neon">
          <CardHeader>
            <CardTitle className="text-[#00ae98]">Vehicles in Current Organization</CardTitle>
            <CardDescription className="text-secondary">{vehicles?.length || 0} vehicles found</CardDescription>
          </CardHeader>
          <CardContent>
            {vehicles?.length === 0 ? (
              <p className="text-secondary">No vehicles in this organization</p>
            ) : (
              <ul className="space-y-2">
                {vehicles?.map((vehicle) => (
                  <li key={vehicle._id} className="p-2 border rounded">
                    {vehicle.name} - {vehicle.make} {vehicle.model} ({vehicle.year})
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="shadow-neon">
          <CardHeader>
            <CardTitle className="text-[#00ae98]">Assessments in Current Organization</CardTitle>
            <CardDescription className="text-secondary">{assessments?.length || 0} assessments found</CardDescription>
          </CardHeader>
          <CardContent>
            {assessments?.length === 0 ? (
              <p className="text-secondary">No assessments in this organization</p>
            ) : (
              <ul className="space-y-2">
                {assessments?.map((assessment) => (
                  <li key={assessment._id} className="p-2 border rounded">
                    {assessment.title} - Status: {assessment.status}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-neon">
        <CardHeader>
          <CardTitle className="text-[#00ae98]">Switch Organization</CardTitle>
          <CardDescription className="text-secondary">
            Switch between organizations to test data isolation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {organizations.map((org) => (
              <Button
                key={org.id}
                variant={currentOrganization?.id === org.id ? "default" : "outline"}
                className={
                  currentOrganization?.id === org.id
                    ? "bg-[#00ae98] hover:bg-[#00ae98]/90 text-white"
                    : "border-[#00ae98] text-[#00ae98] hover:bg-[#00ae98] hover:text-white"
                }
                onClick={() => handleSwitchOrg(org.id)}
              >
                {org.name}
              </Button>
            ))}
          </div>
        </CardContent>
        <CardFooter>
          <p className="text-sm text-secondary">
            When you switch organizations, you should only see data from that organization.
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
