import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { Header } from "@/components/header"
import { InviteMemberForm } from "@/components/invite-member-form"
import { OrganizationMembers } from "@/components/organization-members"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function OrganizationPage() {
  const { userId, orgId } = auth()

  if (!userId) {
    redirect("/sign-in")
  }

  if (!orgId) {
    // If no organization is selected, you might want to redirect to a page
    // where they can create or select an organization
    redirect("/")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 container py-10">
        <h1 className="text-3xl font-bold mb-6 text-[#00ae98] neon-text">Organization Management</h1>

        <Tabs defaultValue="members" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="members" className="data-[state=active]:bg-[#00ae98] data-[state=active]:text-white">
              Members
            </TabsTrigger>
            <TabsTrigger value="invite" className="data-[state=active]:bg-[#00ae98] data-[state=active]:text-white">
              Invite
            </TabsTrigger>
            <TabsTrigger value="settings" className="data-[state=active]:bg-[#00ae98] data-[state=active]:text-white">
              Settings
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-6">
            <OrganizationMembers />
          </TabsContent>

          <TabsContent value="invite" className="space-y-6">
            <InviteMemberForm />
          </TabsContent>

          <TabsContent value="settings" className="space-y-6">
            <div className="bg-[#00ae98]/10 p-6 rounded-lg border border-[#00ae98] text-center">
              Organization settings will be implemented in a future update.
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
