"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useOrganization } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2, Filter, ArrowUpDown, AlertTriangle, Trash2, CheckCircle2 } from "lucide-react"
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
import { ConfirmationModal } from "./confirmation-modal"
import { useToast } from "@/components/ui/use-toast"

export function LeadsWidget() {
  const { organization } = useOrganization()
  const router = useRouter()
  const { toast } = useToast()
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
  const [isDeleting, setIsDeleting] = useState(false)
  const [isConverting, setIsConverting] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showConvertModal, setShowConvertModal] = useState(false)
  const [bulkActionInProgress, setBulkActionInProgress] = useState(false)

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

      toast({
        title: "Lead Converted",
        description: "Lead has been successfully converted to an assessment.",
        variant: "default",
        duration: 5000,
        action: (
          <Button variant="outline" size="sm" onClick={() => router.push(`/assessments/${assessmentId}`)}>
            View Assessment
          </Button>
        async function handleConvert(leadId: Id<"leadAssessments">) {
          if (!organization?.id) return
  
          try {
            setConverting(leadId)
            setError(null)
            const assessmentId = await convertLeadMutation({
              leadAssessmentId: leadId,
              orgId: organization.id,
            })
    
            toast({
              title: "Lead Converted",
              description: "Lead has been successfully converted to an assessment.",
              variant: "default",
              duration: 5000,
              action: (
                <Button variant="outline" size="sm" onClick={() => router.push(`/assessments/${assessmentId}`)}>
                  View Assessment
                </Button>
              ),
            })
    
            // Add a small delay to allow the user to see the toast notification
            setTimeout(() => {
              router.push(`/assessments/${assessmentId}`)
            }, 1500)
          } catch (error) {
            console.error("Failed to convert lead:", error)
            setError("Failed to convert lead. Please try again.")
            toast({
              title: "Conversion Failed",
              description: error instanceof Error ? error.message : "Failed to convert lead. Please try again.",
              variant: "destructive",
            })
          } finally {
            setConverting(null)
          }
        }
      // Clear selection
      setSelectedLeads([])
    } catch (error) {
      console.error("Failed to bulk convert leads:", error)

      // Handle structured error from Convex
      if (error && typeof error === "object" && "data" in error) {
        const convexError = error.data as any
        if (convexError.code === "INVALID_LEADS") {
          toast({
            title: "Conversion Failed",
            description: "Some leads cannot be converted. They may have been already converted or deleted.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Conversion Failed",
            description: convexError.message || "An error occurred during bulk conversion.",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Conversion Failed",
          description: "An unexpected error occurred during bulk conversion.",
          variant: "destructive",
        })
      }
    // Handle structured error from Convex
    if (error && typeof error === "object" && "data" in error) {
      const convexError = error.data
      if (convexError && typeof convexError === "object" && "code" in convexError && convexError.code === "INVALID_LEADS") {
        toast({
          title: "Conversion Failed",
          description: "Some leads cannot be converted. They may have been already converted or deleted.",
          variant: "destructive",
        })
      } else {
        toast({
          title: "Conversion Failed",
          description: typeof convexError === "object" && "message" in convexError && typeof convexError.message === "string" 
            ? convexError.message 
            : "An error occurred during bulk conversion.",
          variant: "destructive",
        })
      }
    } else {
      toast({
        title: "Conversion Failed",
        description: "An unexpected error occurred during bulk conversion.",
        variant: "destructive",
      })
    }
      setSelectedLeads([])
    } catch (error) {
      console.error("Failed to bulk delete leads:", error)

      // Handle structured error from Convex
      if (error && typeof error === "object" && "data" in error) {
        const convexError = error.data as any
        if (convexError.code === "INVALID_LEADS") {
          toast({
            title: "Deletion Failed",
            description: "Some leads cannot be deleted. They may have been already converted or deleted.",
            variant: "destructive",
          })
        } else {
          toast({
            title: "Deletion Failed",
            description: convexError.message || "An error occurred during bulk deletion.",
            variant: "destructive",
          })
        }
      } else {
        toast({
          title: "Deletion Failed",
          description: "An unexpected error occurred during bulk deletion.",
          variant: "destructive",
        })
      }
    } finally {
      setBulkActionInProgress(false)
      setIsDeleting(false)
      setShowDeleteModal(false)
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
    <>
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
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowDeleteModal(true)}
                    disabled={bulkActionInProgress}
                  >
                    {isDeleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete ({selectedLeads.length})
                      </>
                    )}
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setShowConvertModal(true)}
                    disabled={bulkActionInProgress}
                  >
                    {isConverting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Converting...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="mr-2 h-4 w-4" />
                        Convert ({selectedLeads.length})
                      </>
                    )}
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
                <ArrowUpDown
                  className={cn("ml-1 h-4 w-4", sort.field === "createdAt" ? "opacity-100" : "opacity-40")}
                />
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
                    disabled={lead.convertedToAssessment !== undefined}
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

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleBulkDelete}
        title="Delete Leads"
        description={`Are you sure you want to delete ${selectedLeads.length} lead${selectedLeads.length > 1 ? "s" : ""}? This action cannot be undone.`}
        confirmText="Delete Leads"
        cancelText="Cancel"
        icon={<AlertTriangle className="h-6 w-6 text-red-600" />}
        isLoading={isDeleting}
        variant="destructive"
      />

      {/* Convert Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConvertModal}
        onClose={() => setShowConvertModal(false)}
        onConfirm={handleBulkConvert}
        title="Convert Leads"
        description={`Are you sure you want to convert ${selectedLeads.length} lead${selectedLeads.length > 1 ? "s" : ""} to assessments?`}
        confirmText="Convert Leads"
        cancelText="Cancel"
        icon={<CheckCircle2 className="h-6 w-6 text-[#00ae98]" />}
        isLoading={isConverting}
        variant="default"
      />
    </>
  )
}
