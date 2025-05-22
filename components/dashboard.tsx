"use client"

import { useUser, useAuth, useOrganization } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { CassetteLoader } from "./cassette-loader"
import { Building, Users } from "lucide-react"

export default function Dashboard() {
  const router = useRouter()
  const { user } = useUser()
  const { isSignedIn, signOut } = useAuth()
  const { organization } = useOrganization()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading
    const timer = setTimeout(() => {
      setIsLoading(false)
    }, 2000)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return <CassetteLoader />
  }

  if (!isSignedIn || !user) {
    return null
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/sign-in")
  }

  const handleManageOrg = () => {
    router.push("/organization")
  }

  return (
    <div className="container mx-auto py-10">
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-neon">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Avatar className="border-2 border-[#00ae98]">
                  <AvatarImage src={user.imageUrl || "/placeholder.svg"} alt={user.fullName || ""} />
                  <AvatarFallback className="bg-[#00ae98] text-white">
                    {user.firstName?.charAt(0)}
                    {user.lastName?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-[#00ae98] neon-text">
                    Welcome, {user.fullName || user.primaryEmailAddress?.emailAddress}
                  </CardTitle>
                  <CardDescription className="text-secondary">{user.primaryEmailAddress?.emailAddress}</CardDescription>
                </div>
              </div>
              <Button
                variant="outline"
                onClick={handleSignOut}
                className="border-[#00ae98] text-[#00ae98] hover:bg-[#00ae98] hover:text-white"
              >
                Sign Out
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium text-[#00ae98]">User Information</h3>
                <div className="grid grid-cols-2 gap-4 mt-2">
                  <div>
                    <p className="text-sm text-secondary">User ID</p>
                    <p className="font-mono text-xs">{user.id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-secondary">Created</p>
                    <p>{new Date(user.createdAt).toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {organization ? (
          <Card className="shadow-neon">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className="h-10 w-10 rounded-full bg-[#00ae98]/20 flex items-center justify-center">
                    <Building className="h-5 w-5 text-[#00ae98]" />
                  </div>
                  <div>
                    <CardTitle className="text-[#00ae98] neon-text">{organization.name}</CardTitle>
                    <CardDescription className="text-secondary">Organization</CardDescription>
                  </div>
                </div>
                <Button
                  variant="outline"
                  onClick={handleManageOrg}
                  className="border-[#00ae98] text-[#00ae98] hover:bg-[#00ae98] hover:text-white"
                >
                  Manage
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium text-[#00ae98]">Organization Details</h3>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    <div>
                      <p className="text-sm text-secondary">Organization ID</p>
                      <p className="font-mono text-xs">{organization.id}</p>
                    </div>
                    <div>
                      <p className="text-sm text-secondary">Created</p>
                      <p>{new Date(organization.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
                <div className="pt-4">
                  <Button
                    onClick={() => router.push("/organization")}
                    className="w-full bg-[#00ae98] hover:bg-[#00ae98]/90 text-white"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    Manage Members
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-neon">
            <CardHeader>
              <CardTitle className="text-[#00ae98] neon-text">No Organization</CardTitle>
              <CardDescription className="text-secondary">You are not a member of any organization</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-secondary">Create or join an organization to collaborate with others.</p>
                <Button
                  onClick={() => router.push("/organization/create")}
                  className="w-full bg-[#00ae98] hover:bg-[#00ae98]/90 text-white"
                >
                  <Building className="mr-2 h-4 w-4" />
                  Create Organization
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
