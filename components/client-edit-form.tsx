"use client"

import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth } from "@clerk/nextjs"
import { ClientForm } from "@/components/client-form"
import { CassetteLoader } from "@/components/cassette-loader"
import { handleError } from "@/lib/error-handling"
import type { Id } from "@/convex/_generated/dataModel"

interface ClientEditFormProps {
  id: string
}

export function ClientEditForm({ id }: ClientEditFormProps) {
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

  // Fetch client using the token
  const client = useQuery(
    api.clients.getClient,
    { clientId: id as Id<"clients"> },
    {
      additionalHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )

  if (client === undefined) {
    return <CassetteLoader />
  }

  if (!client) {
    return (
      <div className="text-center py-12 bg-[#00ae98]/10 rounded-lg border border-[#00ae98]">
        <h2 className="text-xl font-bold text-[#00ae98]">Client Not Found</h2>
        <p className="text-secondary mt-2">The client you're looking for doesn't exist or you don't have access.</p>
      </div>
    )
  }

  return <ClientForm client={client} />
}
