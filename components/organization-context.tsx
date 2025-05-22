"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { useOrganization, useOrganizationList } from "@clerk/nextjs"
import { useConvexAuth } from "convex/react"
import { CassetteLoader } from "@/components/cassette-loader"

type OrganizationContextType = {
  currentOrganization: {
    id: string
    name: string
    role: string
    slug: string
  } | null
  organizations: Array<{
    id: string
    name: string
    role: string
    slug: string
  }>
  isLoading: boolean
  switchOrganization: (organizationId: string) => Promise<void>
}

const OrganizationContext = createContext<OrganizationContextType>({
  currentOrganization: null,
  organizations: [],
  isLoading: true,
  switchOrganization: async () => {},
})

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth()
  const { organization } = useOrganization()
  const { organizationList, setActive } = useOrganizationList()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!isAuthLoading) {
      setIsLoading(false)
    }
  }, [isAuthLoading])

  const switchOrganization = async (organizationId: string) => {
    setIsLoading(true)
    try {
      await setActive({ organization: organizationId })
    } finally {
      setIsLoading(false)
    }
  }

  // Format organizations for the context
  const formattedOrganizations =
    organizationList?.map((org) => ({
      id: org.id,
      name: org.name,
      role: org.membership.role,
      slug: org.slug || "",
    })) || []

  // Format current organization
  const currentOrganization = organization
    ? {
        id: organization.id,
        name: organization.name,
        role: organization.membership.role,
        slug: organization.slug || "",
      }
    : null

  const value = {
    currentOrganization,
    organizations: formattedOrganizations,
    isLoading,
    switchOrganization,
  }

  if (isLoading) {
    return <CassetteLoader />
  }

  return <OrganizationContext.Provider value={value}>{children}</OrganizationContext.Provider>
}

export const useOrganizationContext = () => useContext(OrganizationContext)
