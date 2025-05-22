"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useOrganization } from "@clerk/nextjs"
import { useRouter } from "next/navigation"
import { withAuth } from "@/components/with-auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Loader2, Filter, ArrowUpDown, Calendar, BarChart } from "lucide-react"
import { cn } from "@/lib/utils"
import { LeadAnalytics } from "@/components/lead-analytics"

function LeadsPage() {
  const router = useRouter()
  const { organization } = useOrganization()
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
  const [activeTab, setActiveTab] = useState<"list" | "analytics">("list")

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
  })

  const leads = leadsResult?.leads || []

  const bulkConvertMutation = useMutation(api.leads.bulkConvertLeads)
  const bulkDeleteMutation = useMutation(api.leads.bulkDeleteLeads)
  const convertLeadToAssessmentMutation = useMutation(api.leads.convertLeadToAssessment)

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

  async function handleConvertLead(leadId: Id<"leadAssessments">) {
    try {
      const assessmentId = await convertLeadToAssessmentMutation({ leadAssessmentId: leadId })
      router.push(`/assessments/${assessmentId}`)
    } catch (error) {
      console.error("Failed to convert lead:", error)
      alert("Failed to convert lead. Please try again.")
    }
  }

  if (!organization) {
    return (
      <div className="container mx-auto py-8">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-[#00ae98]" />
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold">Leads Management</h1>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "list" | "analytics")}>
          <TabsList>
            <TabsTrigger value="list">
              <Calendar className="h-4 w-4 mr-2" />
              Lead List
            </TabsTrigger>
            <TabsTrigger value="analytics">
              <BarChart className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {activeTab === "list" ? (
        <Card>
          <CardHeader>
            <CardTitle>All Leads</CardTitle>
            <CardDescription>Manage and convert leads from self-assessments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <Input
                  placeholder="Search leads..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-64"
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
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
                <Select
                  value={`${sort.field}-${sort.direction}`}
                  onValueChange={(value) => {
                    const [field, direction] = value.split("-") as [typeof sort.field, typeof sort.direction]
                    setSort({ field, direction })
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Sort by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="createdAt-desc">Newest First</SelectItem>
                    <SelectItem value="createdAt-asc">Oldest First</SelectItem>
                    <SelectItem value="customerName-asc">Customer Name (A-Z)</SelectItem>
                    <SelectItem value="customerName-desc">Customer Name (Z-A)</SelectItem>
                    <SelectItem value="vehicleMake-asc">Vehicle Make (A-Z)</SelectItem>
                    <SelectItem value="vehicleMake-desc">Vehicle Make (Z-A)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                {selectedLeads.length > 0 && (
                  <>
                    <Button variant="destructive" onClick={handleBulkDelete}>
                      Delete ({selectedLeads.length})
                    </Button>
                    <Button variant="default" onClick={handleBulkConvert} className="bg-[#00ae98] hover:bg-[#009a86]">
                      Convert ({selectedLeads.length})
                    </Button>
                  </>
                )}
              </div>
            </div>

            {!leadsResult ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-[#00ae98]" />
              </div>
            ) : leads.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg">No leads match your filters</p>
                <p className="text-sm mt-2">Try adjusting your search or filters</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]">
                      <Checkbox
                        checked={selectedLeads.length === leads.length && leads.length > 0}
                        onCheckedChange={handleSelectAll}
                        aria-label="Select all leads"
                      />
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("customerName")}>
                      <div className="flex items-center">
                        Customer
                        <ArrowUpDown
                          className={cn("ml-1 h-4 w-4", sort.field === "customerName" ? "opacity-100" : "opacity-40")}
                        />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("vehicleMake")}>
                      <div className="flex items-center">
                        Vehicle
                        <ArrowUpDown
                          className={cn("ml-1 h-4 w-4", sort.field === "vehicleMake" ? "opacity-100" : "opacity-40")}
                        />
                      </div>
                    </TableHead>
                    <TableHead className="cursor-pointer" onClick={() => toggleSort("createdAt")}>
                      <div className="flex items-center">
                        Date
                        <ArrowUpDown
                          className={cn("ml-1 h-4 w-4", sort.field === "createdAt" ? "opacity-100" : "opacity-40")}
                        />
                      </div>
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leads.map((lead) => (
                    <TableRow
                      key={lead._id}
                      className="cursor-pointer hover:bg-gray-50"
                      onClick={() => router.push(`/leads/${lead._id}`)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedLeads.includes(lead._id)}
                          onCheckedChange={() => handleSelectLead(lead._id)}
                          aria-label={`Select lead for ${lead.customerInfo.name}`}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{lead.customerInfo.name}</p>
                          <p className="text-sm text-gray-500">{lead.customerInfo.email}</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">
                            {lead.vehicleInfo.make} {lead.vehicleInfo.model}
                          </p>
                          <p className="text-sm text-gray-500">
                            {lead.vehicleInfo.year} • {lead.vehicleInfo.color}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell>{new Date(lead.createdAt).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {lead.convertedToAssessment ? (
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                          >
                            Converted
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100"
                          >
                            New Lead
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <div className="flex space-x-2">
                          <Button variant="outline" size="sm" onClick={() => router.push(`/leads/${lead._id}`)}>
                            View
                          </Button>
                          {!lead.convertedToAssessment && (
                            <Button
                              size="sm"
                              className="bg-[#00ae98] text-white hover:bg-[#009a86]"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleConvertLead(lead._id)
                              }}
                            >
                              Convert
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      ) : (
        <LeadAnalytics tenantId={organization.id} />
      )}
    </div>
  )
}

export default withAuth(LeadsPage, ["admin", "member"])
