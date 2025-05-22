"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { FileText, Loader2 } from "lucide-react"
import type { Id } from "@/convex/_generated/dataModel"

interface ReportGeneratorProps {
  assessmentId: Id<"assessments">
  vehicleId: Id<"vehicles">
  assessmentNumber: string
}

export function ReportGenerator({ assessmentId, vehicleId, assessmentNumber }: ReportGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerateReport = async () => {
    setIsGenerating(true)
    try {
      // Call the API to generate the report
      const response = await fetch("/api/reports/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          assessmentId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate report")
      }

      // Get the PDF blob from the response
      const pdfBlob = await response.blob()

      // Create a URL for the blob
      const url = URL.createObjectURL(pdfBlob)

      // Create a link element to download the PDF
      const link = document.createElement("a")
      link.href = url
      link.download = `damage-report-${assessmentNumber}.pdf`
      document.body.appendChild(link)
      link.click()

      // Clean up
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast({
        title: "Report Generated",
        description: "Your damage report has been generated and downloaded.",
      })
    } catch (error: any) {
      console.error("Error generating report:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to generate report",
        variant: "destructive",
      })
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Damage Report</CardTitle>
        <CardDescription>Generate a comprehensive damage assessment report</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">
          The report will include vehicle details, identified damages, repair recommendations, and AI analysis.
        </p>
      </CardContent>
      <CardFooter>
        <Button onClick={handleGenerateReport} disabled={isGenerating}>
          {isGenerating ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <FileText className="mr-2 h-4 w-4" />
              Generate Report
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  )
}
