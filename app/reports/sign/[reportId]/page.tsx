"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { AssessmentApprovalWorkflow, type ApprovalWorkflowData } from "@/components/assessment-approval-workflow"
import { AIAssessmentSummary } from "@/components/ai-assessment-summary"
import { Loader2, FileText, AlertCircle } from "lucide-react"

interface ReportSigningPageProps {
  params: {
    reportId: string
  }
}

export default function ReportSigningPage() {
  const params = useParams()
  const reportId = params.reportId as string
  const [reportData, setReportData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const { toast } = useToast()

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/reports/public/${reportId}`)

        if (!response.ok) {
          throw new Error("Report not found or access denied")
        }

        const data = await response.json()
        setReportData(data)
      } catch (err) {
        console.error("Error fetching report:", err)
        setError(err instanceof Error ? err.message : "Failed to load report")
      } finally {
        setLoading(false)
      }
    }

    if (reportId) {
      fetchReportData()
    }
  }, [reportId])

  const handleApprovalComplete = async (approvalData: ApprovalWorkflowData) => {
    try {
      setSubmitting(true)

      const response = await fetch("/api/signatures/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportId,
          approvalData,
          customerInfo: reportData.customerInfo,
          businessInfo: reportData.businessInfo,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to submit signature")
      }

      const result = await response.json()

      toast({
        title: "Signature Submitted",
        description: "Your signature has been successfully recorded and the assessment has been processed.",
      })

      // Refresh the page to show the completed state
      window.location.reload()
    } catch (error) {
      console.error("Error submitting approval:", error)
      toast({
        title: "Submission Failed",
        description: "Failed to submit your signature. Please try again.",
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading assessment report...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              Error Loading Report
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} className="w-full">
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!reportData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Report Not Found
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">The requested assessment report could not be found.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 space-y-8">
        {/* Header */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Vehicle Assessment Report - Signature Required
            </CardTitle>
            <p className="text-muted-foreground">
              Please review the assessment details below and provide your digital signature to approve or request
              changes.
            </p>
          </CardHeader>
        </Card>

        {/* Assessment Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Assessment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <AIAssessmentSummary
              assessmentData={reportData.assessmentData}
              onItemClick={(item) => {
                // Handle item click if needed
                console.log("Item clicked:", item)
              }}
            />
          </CardContent>
        </Card>

        {/* Approval Workflow */}
        <AssessmentApprovalWorkflow
          assessmentData={reportData.assessmentData}
          reportId={reportId}
          customerInfo={reportData.customerInfo}
          businessInfo={reportData.businessInfo}
          onApprovalComplete={handleApprovalComplete}
          initialApprovalData={reportData.existingApproval}
          readOnly={submitting || reportData.existingApproval?.status === "approved"}
        />

        {/* Footer */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center text-sm text-muted-foreground">
              <p>
                This is a secure digital signature process. Your signature will be encrypted and stored securely for
                legal compliance.
              </p>
              <p className="mt-2">
                If you have any questions about this assessment, please contact {reportData.businessInfo?.name} at{" "}
                {reportData.businessInfo?.phone} or {reportData.businessInfo?.email}.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
