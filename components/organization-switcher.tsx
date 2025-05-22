"use client"

import { useState, useEffect } from "react"
import { useOrganizationList, useOrganization } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { Building, ChevronDown, Plus, Loader2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { handleError } from "@/lib/error-handling"
import { CassetteLoader } from "./cassette-loader"

export function OrganizationSwitcher() {
  const router = useRouter()
  const { organization } = useOrganization()
  const { organizationList, setActive, isLoaded } = useOrganizationList()
  const [isLoading, setIsLoading] = useState(false)
  const [isSwitching, setIsSwitching] = useState<string | null>(null)

  // Redirect to create org page if no orgs exist
  useEffect(() => {
    if (isLoaded && organizationList && organizationList.length === 0) {
      router.push("/organization/create")
    }
  }, [isLoaded, organizationList, router])

  // Don't show the switcher if there's only one org
  if (!isLoaded) {
    return <CassetteLoader size="sm" />
  }

  if (!organizationList || organizationList.length <= 1) {
    return null
  }

  const handleSwitchOrg = async (orgId: string) => {
    try {
      setIsSwitching(orgId)
      await setActive({ organization: orgId })
      router.refresh()
    } catch (error) {
      handleError(error)
    } finally {
      setIsSwitching(null)
    }
  }

  const handleCreateOrg = () => {
    setIsLoading(true)
    router.push("/organization/create")
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 border-[#707070] hover:border-[#00ae98] hover:text-[#00ae98]"
        >
          {organization ? (
            <>
              <Avatar className="h-5 w-5 border border-[#00ae98]">
                <AvatarImage src={organization.imageUrl || ""} alt={organization.name} />
                <AvatarFallback className="bg-[#00ae98]/20 text-[#00ae98] text-xs">
                  {organization.name.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <span className="max-w-[150px] truncate">{organization.name}</span>
            </>
          ) : (
            <>
              <Building className="h-4 w-4" />
              <span>Organizations</span>
            </>
          )}
          <ChevronDown className="h-4 w-4 opacity-50" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="text-[#00ae98]">Organizations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizationList.map((org) => (
          <DropdownMenuItem
            key={org.id}
            className={
              organization?.id === org.id
                ? "bg-[#00ae98]/10 text-[#00ae98] font-medium"
                : "hover:bg-[#00ae98]/10 hover:text-[#00ae98] cursor-pointer"
            }
            disabled={isSwitching !== null}
            onClick={() => org.id !== organization?.id && handleSwitchOrg(org.id)}
          >
            <div className="flex w-full items-center justify-between">
              <div className="flex items-center gap-2">
                <Avatar className="h-5 w-5 border border-[#707070]">
                  <AvatarImage src={org.imageUrl || ""} alt={org.name} />
                  <AvatarFallback className="bg-[#00ae98]/10 text-[#00ae98] text-xs">
                    {org.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <span className="max-w-[150px] truncate">{org.name}</span>
              </div>
              {isSwitching === org.id && <Loader2 className="h-4 w-4 animate-spin" />}
            </div>
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="hover:bg-[#00ae98]/10 hover:text-[#00ae98] cursor-pointer"
          onClick={handleCreateOrg}
          disabled={isLoading}
        >
          <div className="flex items-center gap-2">
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span>Create Organization</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
