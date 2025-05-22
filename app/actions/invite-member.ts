"use server"

import { auth, clerkClient } from "@clerk/nextjs/server"
import { z } from "zod"
import { revalidatePath } from "next/cache"

// Validation schema
const inviteSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  role: z.string().min(1, "Role is required"),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
})

export async function inviteMemberAction(formData: FormData) {
  // Get authentication context
  const { userId, orgId } = auth()

  if (!userId) {
    throw new Error("You must be signed in to invite members")
  }

  if (!orgId) {
    throw new Error("No active organization. Please select or create one")
  }

  // Parse and validate form data
  const rawData = {
    email: formData.get("email")?.toString() || "",
    role: formData.get("role")?.toString() || "org:member",
    firstName: formData.get("firstName")?.toString(),
    lastName: formData.get("lastName")?.toString(),
  }

  const validatedData = inviteSchema.parse(rawData)

  try {
    // Create an organization invitation
    await clerkClient.organizations.createOrganizationInvitation({
      organizationId: orgId,
      emailAddress: validatedData.email,
      role: validatedData.role,
      redirectUrl: `${process.env.NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL || "http://localhost:3000"}/organization`,
      ...(validatedData.firstName && { firstName: validatedData.firstName }),
      ...(validatedData.lastName && { lastName: validatedData.lastName }),
    })

    // Revalidate the members page to show the new invitation
    revalidatePath("/organization/members")

    return {
      success: true,
      message: "Invitation sent successfully",
    }
  } catch (error: any) {
    console.error("Error inviting member:", error)
    return {
      success: false,
      message: error.message || "Failed to send invitation",
    }
  }
}
