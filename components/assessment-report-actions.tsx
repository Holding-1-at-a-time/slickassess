"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, Download, Mail, Share2, Copy, Check, FileText } from "lucide-react"
import {
  generatePdfReport,
  emailAssessmentReport,
  saveAssessmentReport,
  generateReportShareLink,
} from "@/lib/reports/assessment-report-generator"
import type { AIAssessmentData } from "@/components/ai-assessment-summary"

interface AssessmentReportActionsProps {
  assessmentData: AIAssessmentData
  vehicleId: string
  assessmentId?: string
  customerId?: string
  customerInfo?: {
    name: string
    email: string
    phone: string
  }
  businessInfo?: {
    name: string
    address: string
    phone: string
    email: string
  }
}

export function AssessmentReportActions({
  assessmentData,
  vehicleId,
  assessmentId,
  customerId,
  customerInfo,
  businessInfo,
}: AssessmentReportActionsProps) {
  const [isDownloading, setIsDownloading] = useState(false)
  const [isEmailing, setIsEmailing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isGeneratingLink, setIsGeneratingLink] = useState(false)
  const [emailAddress, setEmailAddress] = useState(customerInfo?.email || "")
  const [shareLink, setShareLink] = useState("")
  const [copied, setCopied] = useState(false)
  const [savedReportId, setSavedReportId] = useState<string | null>(null)

  const { toast } = useToast()

  const handleDownloadPdf = async () => {
    try {
      setIsDownloading(true)
      const pdfBlob = await generatePdfReport(assessmentData, customerInfo, businessInfo)

      // Create a download link
      const url = URL.createObjectURL(pdfBlob)
      const a = document.createElement("a")
      a.href = url
      a.download = `assessment-report-${Date.now()}.pdf`
      document.body.appendChild(a)
      a.click()

      // Clean up
      URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: "Report Downloaded",
        description: "The assessment report has been downloaded successfully.",
      })
    } catch (error) {
      console.error("Error downloading PDF:", error)
      toast({
        title: "Download Failed",
        description: "Failed to download the assessment report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsDownloading(false)
    }
  }

  const handleEmailReport = async () => {
    if (!emailAddress) {
      toast({
        title: "Email Required",
        description: "Please enter an email address to send the report.",
        variant: "destructive",
      })
      return
    }

    try {
      setIsEmailing(true)
      const success = await emailAssessmentReport(assessmentData, emailAddress, customerInfo, businessInfo)

      if (success) {
        toast({
          title: "Report Sent",
          description: `The assessment report has been sent to ${emailAddress}.`,
        })
      } else {
        throw new Error("Failed to send email")
      }
    } catch (error) {
      console.error("Error emailing report:", error)
      toast({
        title: "Email Failed",
        description: "Failed to email the assessment report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsEmailing(false)
    }
  }

  const handleSaveReport = async () => {
    try {
      setIsSaving(true)
      const reportId = await saveAssessmentReport(assessmentData, vehicleId, assessmentId, customerId)

      setSavedReportId(reportId)

      toast({
        title: "Report Saved",
        description: "The assessment report has been saved successfully.",
      })
    } catch (error) {
      console.error("Error saving report:", error)
      toast({
        title: "Save Failed",
        description: "Failed to save the assessment report. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerateShareLink = async () => {
    if (!savedReportId) {
      // Save the report first if not already saved
      try {
        setIsSaving(true)
        const reportId = await saveAssessmentReport(assessmentData, vehicleId, assessmentId, customerId)
        setSavedReportId(reportId)
        setIsSaving(false)

        // Now generate the share link
        await generateShareLink(reportId)
      } catch (error) {
        console.error("Error saving report:", error)
        setIsSaving(false)
        toast({
          title: "Save Failed",
          description: "Failed to save the report before generating a share link.",
          variant: "destructive",
        })
      }
    } else {
      // Generate share link for already saved report
      await generateShareLink(savedReportId)
    }
  }

  const generateShareLink = async (reportId: string) => {
    try {
      setIsGeneratingLink(true)
      const link = await generateReportShareLink(reportId)

      setShareLink(link)

      toast({
        title: "Share Link Generated",
        description: "A shareable link has been generated for this report.",
      })
    } catch (error) {
      console.error("Error generating share link:", error)
      toast({
        title: "Link Generation Failed",
        description: "Failed to generate a shareable link. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingLink(false)
    }
  }

  const copyShareLink = () => {
    navigator.clipboard.writeText(shareLink)
    setCopied(true)

    setTimeout(() => {
      setCopied(false)
    }, 2000)

    toast({
      title: "Link Copied",
      description: "The shareable link has been copied to your clipboard.",
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Assessment Report Actions
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button onClick={handleDownloadPdf} disabled={isDownloading} className="w-full">
            {isDownloading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Downloading...
              </>
            ) : (
              <>
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </>
            )}
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button className="w-full">
                <Mail className="mr-2 h-4 w-4" />
                Email Report
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Email Assessment Report</DialogTitle>
                <DialogDescription>
                  Enter the email address where you'd like to send this assessment report.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={emailAddress}
                    onChange={(e) => setEmailAddress(e.target.value)}
                    placeholder="customer@example.com"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button onClick={handleEmailReport} disabled={isEmailing || !emailAddress}>
                  {isEmailing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    "Send Report"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button onClick={handleSaveReport} disabled={isSaving} variant="outline" className="w-full">
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Save Report
              </>
            )}
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button
                onClick={savedReportId ? () => {} : handleGenerateShareLink}
                disabled={isGeneratingLink}
                variant="outline"
                className="w-full"
              >
                {isGeneratingLink ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Report
                  </>
                )}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Share Assessment Report</DialogTitle>
                <DialogDescription>Share this assessment report with others using the link below.</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                {!shareLink && !isGeneratingLink ? (
                  <Button onClick={handleGenerateShareLink} disabled={isGeneratingLink} className="w-full">
                    {isGeneratingLink ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Share2 className="mr-2 h-4 w-4" />
                        Generate Share Link
                      </>
                    )}
                  </Button>
                ) : isGeneratingLink ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Label htmlFor="shareLink">Shareable Link</Label>
                    <div className="flex items-center space-x-2">
                      <Input id="shareLink" value={shareLink} readOnly className="flex-1" />
                      <Button size="icon" onClick={copyShareLink} disabled={copied}>
                        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">This link will expire in 30 days.</p>
                  </div>
                )}
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        <p>Reports can be downloaded, emailed, saved for future reference, or shared with customers.</p>
      </CardFooter>
    </Card>
  )
}
