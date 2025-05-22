import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { Navbar } from "@/components/navbar"
import { InviteMemberForm } from "@/components/invite-member-form"
import { OrganizationMembers } from "@/components/organization-members"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function OrganizationMembersPage() {
  const { userId, orgId } = auth()

  if (!userId) {
    redirect("/sign-in")
  }

  if (!orgId) {
    // If no organization is selected, redirect to create one
    redirect("/organization/create")
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-10">
        <h1 className="text-3xl font-bold mb-6 text-[#00ae98] neon-text">Organization Members</h1>

        <Tabs defaultValue="members" className="w-full">
          <TabsList className="mb-6">
            <TabsTrigger value="members" className="data-[state=active]:bg-[#00ae98] data-[state=active]:text-white">
              Members
            </TabsTrigger>
            <TabsTrigger value="invite" className="data-[state=active]:bg-[#00ae98] data-[state=active]:text-white">
              Invite
            </TabsTrigger>
          </TabsList>

          <TabsContent value="members" className="space-y-6">
            <OrganizationMembers />
          </TabsContent>

          <TabsContent value="invite" className="space-y-6">
            <InviteMemberForm />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  )
}
