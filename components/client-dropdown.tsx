"use client"

import { useState, useEffect } from "react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth } from "@clerk/nextjs"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { CassetteLoader } from "@/components/cassette-loader"
import { handleError } from "@/lib/error-handling"

interface ClientDropdownProps {
  onSelect: (clientId: string) => void
  required?: boolean
}

export function ClientDropdown({ onSelect, required = false }: ClientDropdownProps) {
  const { getToken } = useAuth()
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch the token
  useEffect(() => {
    async function fetchToken() {
      try {
        const newToken = await getToken({ template: "convex" })
        setToken(newToken)
      } catch (error) {
        handleError(error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchToken()
  }, [getToken])

  // Fetch clients using the token
  const clients = useQuery(
    api.clients.getClients,
    {},
    {
      additionalHeaders: token ? { Authorization: `Bearer ${token}` } : undefined,
    },
  )

  if (isLoading || clients === undefined) {
    return <CassetteLoader size="sm" />
  }

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-[#00ae98]">
        Client {required && <span className="text-red-500">*</span>}
      </label>
      <Select onValueChange={onSelect}>
        <SelectTrigger className="border-secondary focus:ring-[#00ae98]">
          <SelectValue placeholder="Select a client" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectLabel>Clients</SelectLabel>
            {clients.length === 0 ? (
              <SelectItem value="no-clients" disabled>
                No clients available
              </SelectItem>
            ) : (
              clients.map((client) => (
                <SelectItem key={client._id} value={client._id}>
                  {client.name}
                </SelectItem>
              ))
            )}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
  )
}
