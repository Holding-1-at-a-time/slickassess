"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { useOrganization } from "@clerk/nextjs"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Loader2 } from "lucide-react"
import { useRouter } from "next/navigation"

export function LeadsWidget() {
  const { organization } = useOrganization()
  const router = useRouter()
  const [converting, setConverting] = useState<Id<"leadAssessments"> | null>(null)

  const leads = useQuery(api.leads.listByTenant, {
    tenantId: organization?.id || "",
  })

  const convertLeadMutation = useMutation(api.leads.convertLeadToAssessment)

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

  if (!leads || leads.length === 0) {
    return (
      <Card className="p-6 bg-neutral-100 dark:bg-neutral-800">
        <p className="text-center text-gray-500">No new leads available.</p>
      </Card>
    )
  }

  return (
    <Card className="bg-neutral-100 dark:bg-neutral-800 p-6 rounded">
      <ul className="space-y-4">
        {leads.map((lead) => (
          <li key={lead._id} className="flex justify-between items-center border-b pb-4 last:border-0">
            <div>
              <p className="font-medium">
                {lead.customerInfo.name} - {lead.customerInfo.email}
              </p>
              <p className="text-sm text-gray-500">
                {lead.vehicleInfo.make} {lead.vehicleInfo.model} ({lead.vehicleInfo.year})
              </p>
              <p className="text-xs text-gray-400 mt-1">Submitted {new Date(lead.createdAt).toLocaleDateString()}</p>
            </div>
            <Button
              onClick={() => handleConvert(lead._id)}
              disabled={converting === lead._id}
              className="px-3 py-1 bg-[#00ae98] text-white rounded hover:bg-[#009a86]"
            >
              {converting === lead._id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Converting...
                </>
              ) : (
                "Convert"
              )}
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
