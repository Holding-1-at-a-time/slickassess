import { NextResponse } from "next/server"
import { auth, clerkClient } from "@clerk/nextjs/server"

export async function GET() {
  const { userId, orgId } = auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!orgId) {
    return NextResponse.json({ error: "No active organization" }, { status: 400 })
  }

  try {
    const memberships = await clerkClient.organizations.getOrganizationMembershipList({
      organizationId: orgId,
      limit: 100,
    })

    const members = memberships.map((membership) => ({
      id: membership.id,
      userId: membership.publicUserData?.userId,
      email: membership.publicUserData?.identifier || membership.emailAddress,
      firstName: membership.publicUserData?.firstName,
      lastName: membership.publicUserData?.lastName,
      imageUrl: membership.publicUserData?.imageUrl,
      role: membership.role,
      status: membership.status,
      createdAt: membership.createdAt,
    }))

    return NextResponse.json({ members })
  } catch (error: any) {
    console.error("Error fetching members:", error)
    return NextResponse.json({ error: error.message || "Failed to fetch members" }, { status: 500 })
  }
}
