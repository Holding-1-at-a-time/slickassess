import { defineConfig } from "convex/config"

export default defineConfig({
  // Configure Clerk JWT verification
  auth: {
    providers: [
      {
        domain: "https://clerk.your-domain.com",
        applicationID: "convex",
      },
    ],
  },
})
