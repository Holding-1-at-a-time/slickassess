"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useOrganization } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2, Filter, ArrowUpDown } from "lucide-react"
import { useRouter } from "next/navigation"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export function LeadsWidget() {
  const { organization } = useOrganization()
  const router = useRouter()
  const [converting, setConverting] = useState<Id<"leadAssessments"> | null>(null)
  const [selectedLeads, setSelectedLeads] = useState<Id<"leadAssessments">[]>([])
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState({
    status: "unconverted" as "all" | "converted" | "unconverted",
    vehicleMake: undefined as string | undefined,
  })
  const [sort, setSort] = useState({
    field: "createdAt" as "createdAt" | "customerName" | "vehicleMake" | "vehicleModel" | "vehicleYear",
    direction: "desc" as "asc" | "desc",
  })

  // Get filter options (makes, models)
  const filterOptions = useQuery(api.leads.getFilterOptions, {
    tenantId: organization?.id || "",
  })

  // Get leads with filtering and sorting
  const leadsResult = useQuery(api.leads.listByTenant, {
    tenantId: organization?.id || "",
    filters: {
      status: filters.status,
      vehicleMake: filters.vehicleMake,
      search: search.length > 0 ? search : undefined,
    },
    sort,
    pagination: {
      limit: 5, // Only show 5 leads in the widget
    },
  })

  const leads = leadsResult?.leads || []

  const convertLeadMutation = useMutation(api.leads.convertLeadToAssessment)
  const bulkConvertMutation = useMutation(api.leads.bulkConvertLeads)
  const bulkDeleteMutation = useMutation(api.leads.bulkDeleteLeads)

  async function handleConvert(leadId: Id<"leadAssessments">) {
    try {
      setConverting(leadId)
      const assessmentId = await convertLeadMutation({ leadAssessmentId: leadId })
      router.push(`/assessments/${assessmentId}`)
    } catch (error) {
      console.error("Failed to convert lead:", error)
    } finally {
      setConverting(null)
    }
  }

  async function handleBulkConvert() {
    if (selectedLeads.length === 0) return

    try {
      const result = await bulkConvertMutation({ leadIds: selectedLeads })
      if (result.success.length > 0) {
        // Show success message
        alert(`Successfully converted ${result.success.length} leads`)
        // Clear selection
        setSelectedLeads([])
      }
      if (result.failed.length > 0) {
        // Show error message
        alert(`Failed to convert ${result.failed.length} leads`)
      }
    } catch (error) {
      console.error("Failed to bulk convert leads:", error)
    }
  }

  async function handleBulkDelete() {
    if (selectedLeads.length === 0) return

    // Confirm deletion
    if (!confirm(`Are you sure you want to delete ${selectedLeads.length} leads? This action cannot be undone.`)) {
      return
    }

    try {
      const result = await bulkDeleteMutation({ leadIds: selectedLeads })
      if (result.success.length > 0) {
        // Show success message
        alert(`Successfully deleted ${result.success.length} leads`)
        // Clear selection
        setSelectedLeads([])
      }
      if (result.failed.length > 0) {
        // Show error message
        alert(`Failed to delete ${result.failed.length} leads`)
      }
    } catch (error) {
      console.error("Failed to bulk delete leads:", error)
    }
  }

  function handleSelectAll() {
    if (selectedLeads.length === leads.length) {
      setSelectedLeads([])
    } else {
      setSelectedLeads(leads.map((lead) => lead._id))
    }
  }

  function handleSelectLead(leadId: Id<"leadAssessments">) {
    if (selectedLeads.includes(leadId)) {
      setSelectedLeads(selectedLeads.filter((id) => id !== leadId))
    } else {
      setSelectedLeads([...selectedLeads, leadId])
    }
  }

  function handleViewDetails(leadId: Id<"leadAssessments">) {
    router.push(`/leads/${leadId}`)
  }

  function toggleSort(field: typeof sort.field) {
    if (sort.field === field) {
      setSort({
        ...sort,
        direction: sort.direction === "asc" ? "desc" : "asc",
      })
    } else {
      setSort({
        field,
        direction: "desc",
      })
    }
  }

  if (!leadsResult) {
    return (
      <Card className="p-6 bg-neutral-100 dark:bg-neutral-800">
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-[#00ae98]" />
        </div>
      </Card>
    )
  }

  if (leads.length === 0) {
    return (
      <Card className="p-6 bg-neutral-100 dark:bg-neutral-800">
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Input
                placeholder="Search leads..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-64"
              />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="h-4 w-4 mr-2" />
                    Filters
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Status</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={filters.status === "all"}
                    onCheckedChange={() => setFilters({ ...filters, status: "all" })}
                  >
                    All Leads
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filters.status === "unconverted"}
                    onCheckedChange={() => setFilters({ ...filters, status: "unconverted" })}
                  >
                    Unconverted Only
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={filters.status === "converted"}
                    onCheckedChange={() => setFilters({ ...filters, status: "converted" })}
                  >
                    Converted Only
                  </DropdownMenuCheckboxItem>

                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Vehicle Make</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuCheckboxItem
                    checked={filters.vehicleMake === undefined}
                    onCheckedChange={() => setFilters({ ...filters, vehicleMake: undefined })}
                  >
                    All Makes
                  </DropdownMenuCheckboxItem>
                  {filterOptions?.makes.map((make) => (
                    <DropdownMenuCheckboxItem
                      key={make}
                      checked={filters.vehicleMake === make}
                      onCheckedChange={() => setFilters({ ...filters, vehicleMake: make })}
                    >
                      {make}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <Button variant="outline" size="sm" onClick={() => router.push("/leads")}>
              View All Leads
            </Button>
          </div>
          <p className="text-center text-gray-500">No leads match your filters.</p>
        </div>
      </Card>
    )
  }

  return (
    <Card className="bg-neutral-100 dark:bg-neutral-800 p-6 rounded">
      <div className="flex flex-col space-y-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <Input
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64"
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filters
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={filters.status === "all"}
                  onCheckedChange={() => setFilters({ ...filters, status: "all" })}
                >
                  All Leads
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.status === "unconverted"}
                  onCheckedChange={() => setFilters({ ...filters, status: "unconverted" })}
                >
                  Unconverted Only
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.status === "converted"}
                  onCheckedChange={() => setFilters({ ...filters, status: "converted" })}
                >
                  Converted Only
                </DropdownMenuCheckboxItem>

                <DropdownMenuSeparator />
                <DropdownMenuLabel>Vehicle Make</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuCheckboxItem
                  checked={filters.vehicleMake === undefined}
                  onCheckedChange={() => setFilters({ ...filters, vehicleMake: undefined })}
                >
                  All Makes
                </DropdownMenuCheckboxItem>
                {filterOptions?.makes.map((make) => (
                  <DropdownMenuCheckboxItem
                    key={make}
                    checked={filters.vehicleMake === make}
                    onCheckedChange={() => setFilters({ ...filters, vehicleMake: make })}
                  >
                    {make}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex items-center space-x-2">
            {selectedLeads.length > 0 && (
              <>
                <Button variant="destructive" size="sm" onClick={handleBulkDelete}>
                  Delete ({selectedLeads.length})
                </Button>
                <Button variant="default" size="sm" onClick={handleBulkConvert}>
                  Convert ({selectedLeads.length})
                </Button>
              </>
            )}
            <Button variant="outline" size="sm" onClick={() => router.push("/leads")}>
              View All Leads
            </Button>
          </div>
        </div>

        <div className="flex items-center justify-between border-b pb-2">
          <div className="flex items-center">
            <Checkbox
              checked={selectedLeads.length === leads.length && leads.length > 0}
              onCheckedChange={handleSelectAll}
              className="mr-2"
              aria-label="Select all leads"
            />
            <Button variant="ghost" size="sm" className="font-medium" onClick={() => toggleSort("customerName")}>
              Customer
              <ArrowUpDown
                className={cn("ml-1 h-4 w-4", sort.field === "customerName" ? "opacity-100" : "opacity-40")}
              />
            </Button>
          </div>
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" className="font-medium" onClick={() => toggleSort("vehicleMake")}>
              Vehicle
              <ArrowUpDown
                className={cn("ml-1 h-4 w-4", sort.field === "vehicleMake" ? "opacity-100" : "opacity-40")}
              />
            </Button>
            <Button variant="ghost" size="sm" className="font-medium" onClick={() => toggleSort("createdAt")}>
              Date
              <ArrowUpDown className={cn("ml-1 h-4 w-4", sort.field === "createdAt" ? "opacity-100" : "opacity-40")} />
            </Button>
            <span className="w-24 text-center font-medium">Actions</span>
          </div>
        </div>

        <ul className="space-y-2">
          {leads.map((lead) => (
            <li
              key={lead._id}
              className="flex justify-between items-center py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded px-2"
            >
              <div className="flex items-center">
                <Checkbox
                  checked={selectedLeads.includes(lead._id)}
                  onCheckedChange={() => handleSelectLead(lead._id)}
                  className="mr-2"
                  aria-label={`Select lead for ${lead.customerInfo.name}`}
                />
                <div>
                  <p className="font-medium">{lead.customerInfo.name}</p>
                  <p className="text-sm text-gray-500">{lead.customerInfo.email}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="w-40">
                  <p className="font-medium">
                    {lead.vehicleInfo.make} {lead.vehicleInfo.model}
                  </p>
                  <p className="text-sm text-gray-500">{lead.vehicleInfo.year}</p>
                </div>
                <div className="w-32 text-right">
                  <p className="text-sm">{new Date(lead.createdAt).toLocaleDateString()}</p>
                  {lead.convertedToAssessment && (
                    <Badge
                      variant="outline"
                      className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                    >
                      Converted
                    </Badge>
                  )}
                </div>
                <div className="flex space-x-2 w-24 justify-end">
                  <Button variant="outline" size="sm" onClick={() => handleViewDetails(lead._id)}>
                    View
                  </Button>
                  {!lead.convertedToAssessment && (
                    <Button
                      onClick={() => handleConvert(lead._id)}
                      disabled={converting === lead._id}
                      size="sm"
                      className="bg-[#00ae98] text-white hover:bg-[#009a86]"
                    >
                      {converting === lead._id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Convert"}
                    </Button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>

        {leads.length > 0 && (
          <div className="flex justify-center mt-2">
            <Button variant="link" onClick={() => router.push("/leads")}>
              View All Leads
            </Button>
          </div>
        )}
      </div>
    </Card>
  )
}
