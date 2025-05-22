"use client"

import { useToast } from "@/components/ui/use-toast"
import { ToastAction } from "@/components/ui/toast"
import type { useRouter } from "next/navigation"

interface UseLeadToastOptions {
  router: ReturnType<typeof useRouter>
}

export function useLeadToast({ router }: UseLeadToastOptions) {
  const { toast } = useToast()

  const showConversionSuccess = (assessmentId: string) => {
    toast({
      title: "Lead Converted Successfully",
      description: "The lead has been converted to a full assessment.",
      action: (
        <ToastAction altText="View Assessment" onClick={() => router.push(`/assessments/${assessmentId}`)}>
          View Assessment
        </ToastAction>
      ),
    })
  }

  const showConversionError = (error: Error) => {
    toast({
      title: "Conversion Failed",
      description: error.message || "There was an error converting the lead. Please try again.",
      variant: "destructive",
    })
  }

  const showBulkConversionSuccess = (count: number) => {
    toast({
      title: "Bulk Conversion Successful",
      description: `Successfully converted ${count} leads to assessments.`,
      action: (
        <ToastAction altText="View Assessments" onClick={() => router.push("/assessments")}>
          View Assessments
        </ToastAction>
      ),
    })
  }

  const showBulkDeletionSuccess = (count: number) => {
    toast({
      title: "Leads Deleted",
      description: `Successfully deleted ${count} leads.`,
    })
  }

  const showActionError = (action: string, error: Error) => {
    toast({
      title: `${action} Failed`,
      description: error.message || `There was an error during ${action.toLowerCase()}. Please try again.`,
      variant: "destructive",
    })
  }

  return {
    showConversionSuccess,
    showConversionError,
    showBulkConversionSuccess,
    showBulkDeletionSuccess,
    showActionError,
  }
}
