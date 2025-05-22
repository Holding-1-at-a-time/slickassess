import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { InviteMemberForm } from "@/components/invite-member-form"
import { OrganizationMemberList } from "@/components/organization-member-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function OrganizationSettingsPage() {
  const { userId, orgId, orgRole } = auth()

  if (!userId) {
    redirect("/sign-in")
  }

  if (!orgId) {
    redirect("/organization/create")
  }

  // Check if user has admin role
  const isAdmin = orgRole === "admin" || orgRole === "org:admin"

  if (!isAdmin) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-10">
        <h1 className="text-3xl font-bold mb-6 text-[#00ae98] neon-text">Organization Settings</h1>

        <Tabs defaultValue="members" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="members" className="data-[state=active]:bg-[#00ae98] data-[state=active]:text-white">
              Members
            </TabsTrigger>
            <TabsTrigger value="invite" className="data-[state=active]:bg-[#00ae98] data-[state=active]:text-white">
              Invite
            </TabsTrigger>
            <TabsTrigger value="general" className="data-[state=active]:bg-[#00ae98] data-[state=active]:text-white">
              General
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-6">
            <OrganizationMemberList />
          </TabsContent>

          <TabsContent value="invite" className="space-y-6">
            <InviteMemberForm />
          </TabsContent>

          <TabsContent value="general" className="space-y-6">
            <Card className="shadow-neon">
              <CardHeader>
                <CardTitle className="text-[#00ae98] neon-text">Organization Details</CardTitle>
                <CardDescription className="text-secondary">View and update your organization settings</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="bg-[#00ae98]/10 p-6 rounded-lg border border-[#00ae98] text-center">
                  Organization settings will be implemented in a future update.
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
