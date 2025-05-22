import { ConvexReactClient } from "convex/react"
import { getAuth } from "@clerk/nextjs"

// Create a singleton Convex client that automatically attaches Clerk's JWT
export const convex = new ConvexReactClient({
  url: process.env.NEXT_PUBLIC_CONVEX_URL!,
  fetchOptions: async () => {
    try {
      // Clerk's getAuth() lets us read the current session's JWT
      const { getToken } = getAuth()

      // "template: 'convex'" must match the name of the JWT template you set up in Clerk
      const jwt = await getToken({ template: "convex" })

      // Return the JWT in the Authorization header
      return {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      }
    } catch (error) {
      // Handle any errors (e.g., user not authenticated)
      console.error("Error getting Clerk token for Convex:", error)
      return {}
    }
  },
})
