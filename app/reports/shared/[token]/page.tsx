"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { AssessmentReport } from "@/components/assessment-report"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Download, FileText, AlertTriangle } from "lucide-react"
import { generatePdfReport } from "@/lib/reports/assessment-report-generator"

export default function SharedReportPage() {
  const params = useParams()
  const token = params.token as string

  const [isDownloading, setIsDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const report = useQuery(api.reports.getReportByShareToken, { shareToken: token })

  useEffect(() => {
    if (report === undefined) {
      // Still loading
    } else if (report === null) {
      setError("Report not found or link has expired")
    }
  }, [report])

  const handleDownloadPdf = async () => {
    if (!report || !report.assessmentData) return

    try {
      setIsDownloading(true)
      const pdfBlob = await generatePdfReport(report.assessmentData)

      // Create a download link
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `assessment-report-${report.reportNumber}.pdf`
      document.body.appendChild(a)
      a.click()

      // Clean up
      URL.revokeObjectURL(url)
      document.body.removeChild(a)
    } catch (error) {
      console.error("Error downloading PDF:", error)
      setError("Failed to download the report. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  if (error) {
    return (
      <div className="container max-w-4xl mx-auto py-12">
        <Card className="text-center">
          <CardHeader>
            <CardTitle className="flex items-center justify-center gap-2">
              <AlertTriangle className="h-6 w-6 text-red-500" />
              Error Accessing Report
            </CardTitle>
            <CardDescription>We couldn't access the requested assessment report.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button variant="outline" onClick={() => (window.location.href = "/")}>
              Return to Home
            </Button>
          </CardFooter>
        </Card>
      </div>
    )
  }

  if (!report) {
    return (
      <div className="container max-w-4xl mx-auto py-12">
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-[200px] w-full" />
            <Skeleton className="h-[400px] w-full" />
          </CardContent>
          <CardFooter>
            <Skeleton className="h-10 w-full" />
          </CardFooter>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-12">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Vehicle Assessment Report
          </CardTitle>
          <CardDescription>
            Report #{report.reportNumber} • Generated on {new Date(report.generatedDate).toLocaleDateString()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            This is a shared vehicle assessment report with detailed findings and pricing information.
          </p>
          <Button onClick={handleDownloadPdf} disabled={isDownloading} className="w-full sm:w-auto">
            <Download className="mr-2 h-4 w-4" />
            {isDownloading ? "Downloading..." : "Download PDF Report"}
          </Button>
        </CardContent>
      </Card>

      <AssessmentReport
        assessmentData={report.assessmentData}
        reportNumber={report.reportNumber}
        generatedDate={new Date(report.generatedDate)}
      />
    </div>
  )
}
