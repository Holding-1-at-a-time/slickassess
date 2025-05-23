"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { useToast } from "@/components/ui/use-toast"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { DigitalSignaturePad, type SignatureData } from "./digital-signature-pad"
import { SignatureVerification } from "./signature-verification"
import { CheckCircle, XCircle, Clock, FileText, User, Calendar } from "lucide-react"
import type { AIAssessmentData } from "./ai-assessment-summary"

interface ApprovalStep {
  id: string
  title: string
  description: string
  required: boolean
  completed: boolean
  signature?: SignatureData
  comments?: string
  completedAt?: string
  completedBy?: string
}

interface AssessmentApprovalWorkflowProps {
  assessmentData: AIAssessmentData
  reportId: string
  customerInfo: {
    name: string
    email: string
    phone: string
  }
  businessInfo: {
    name: string
    address: string
    phone: string
    email: string
  }
  onApprovalComplete: (approvalData: ApprovalWorkflowData) => void
  initialApprovalData?: ApprovalWorkflowData
  readOnly?: boolean
}

export interface ApprovalWorkflowData {
  reportId: string
  status: "pending" | "approved" | "rejected" | "requires_changes"
  steps: ApprovalStep[]
  finalSignature?: SignatureData
  approvalComments?: string
  approvedAt?: string
  approvedBy?: string
  rejectionReason?: string
  requestedChanges?: string
}

export function AssessmentApprovalWorkflow({
  assessmentData,
  reportId,
  customerInfo,
  businessInfo,
  onApprovalComplete,
  initialApprovalData,
  readOnly = false,
}: AssessmentApprovalWorkflowProps) {
  const [approvalData, setApprovalData] = useState<ApprovalWorkflowData>(
    initialApprovalData || {
      reportId,
      status: "pending",
      steps: [
        {
          id: "review_assessment",
          title: "Review Assessment Details",
          description: "Review the complete vehicle assessment and pricing breakdown",
          required: true,
          completed: false,
        },
        {
          id: "verify_pricing",
          title: "Verify Pricing Information",
          description: "Confirm the pricing breakdown and total estimate",
          required: true,
          completed: false,
        },
        {
          id: "approve_services",
          title: "Approve Recommended Services",
          description: "Approve or modify the recommended services",
          required: true,
          completed: false,
        },
        {
          id: "final_signature",
          title: "Digital Signature",
          description: "Provide digital signature to approve the assessment",
          required: true,
          completed: false,
        },
      ],
    },
  )

  const [currentStep, setCurrentStep] = useState(0)
  const [showSignatureDialog, setShowSignatureDialog] = useState(false)
  const [comments, setComments] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  const { toast } = useToast()

  const handleStepComplete = (stepId: string, signature?: SignatureData, stepComments?: string) => {
    setApprovalData((prev) => ({
      ...prev,
      steps: prev.steps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              completed: true,
              signature,
              comments: stepComments,
              completedAt: new Date().toISOString(),
              completedBy: customerInfo.name,
            }
          : step,
      ),
    }))

    // Move to next step
    const nextStepIndex = approvalData.steps.findIndex((step) => !step.completed)
    if (nextStepIndex !== -1) {
      setCurrentStep(nextStepIndex)
    }
  }

  const handleSignatureComplete = async (signatureData: SignatureData) => {
    try {
      setIsSubmitting(true)

      // Complete the final signature step
      handleStepComplete("final_signature", signatureData)

      // Update approval data with final signature
      const finalApprovalData: ApprovalWorkflowData = {
        ...approvalData,
        status: "approved",
        finalSignature: signatureData,
        approvalComments: comments,
        approvedAt: new Date().toISOString(),
        approvedBy: customerInfo.name,
        steps: approvalData.steps.map((step) =>
          step.id === "final_signature"
            ? {
                ...step,
                completed: true,
                signature: signatureData,
                completedAt: new Date().toISOString(),
                completedBy: customerInfo.name,
              }
            : step,
        ),
      }

      setApprovalData(finalApprovalData)
      setShowSignatureDialog(false)

      await onApprovalComplete(finalApprovalData)

      toast({
        title: "Assessment Approved",
        description: "The assessment has been successfully approved and signed.",
      })
    } catch (error) {
      console.error("Error completing approval:", error)
      toast({
        title: "Approval Failed",
        description: "Failed to complete the approval process. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRejectAssessment = async () => {
    try {
      setIsSubmitting(true)

      const rejectionData: ApprovalWorkflowData = {
        ...approvalData,
        status: "rejected",
        rejectionReason: comments,
        approvedAt: new Date().toISOString(),
        approvedBy: customerInfo.name,
      }

      setApprovalData(rejectionData)
      await onApprovalComplete(rejectionData)

      toast({
        title: "Assessment Rejected",
        description: "The assessment has been rejected with your comments.",
      })
    } catch (error) {
      console.error("Error rejecting assessment:", error)
      toast({
        title: "Rejection Failed",
        description: "Failed to reject the assessment. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRequestChanges = async () => {
    try {
      setIsSubmitting(true)

      const changesData: ApprovalWorkflowData = {
        ...approvalData,
        status: "requires_changes",
        requestedChanges: comments,
        approvedAt: new Date().toISOString(),
        approvedBy: customerInfo.name,
      }

      setApprovalData(changesData)
      await onApprovalComplete(changesData)

      toast({
        title: "Changes Requested",
        description: "Your change requests have been submitted.",
      })
    } catch (error) {
      console.error("Error requesting changes:", error)
      toast({
        title: "Request Failed",
        description: "Failed to submit change requests. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStepIcon = (step: ApprovalStep, index: number) => {
    if (step.completed) {
      return <CheckCircle className="h-5 w-5 text-green-600" />
    } else if (index === currentStep && !readOnly) {
      return <Clock className="h-5 w-5 text-blue-600" />
    } else {
      return <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
    }
  }

  const getStatusBadge = () => {
    switch (approvalData.status) {
      case "approved":
        return (
          <Badge className="bg-green-100 text-green-800 border-green-200">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        )
      case "rejected":
        return (
          <Badge className="bg-red-100 text-red-800 border-red-200">
            <XCircle className="h-3 w-3 mr-1" />
            Rejected
          </Badge>
        )
      case "requires_changes":
        return (
          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
            <Clock className="h-3 w-3 mr-1" />
            Changes Requested
          </Badge>
        )
      default:
        return (
          <Badge className="bg-blue-100 text-blue-800 border-blue-200">
            <Clock className="h-3 w-3 mr-1" />
            Pending Approval
          </Badge>
        )
    }
  }

  const allStepsCompleted = approvalData.steps.every((step) => step.completed)
  const isApproved = approvalData.status === "approved"

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Assessment Approval Workflow
            </span>
            {getStatusBadge()}
          </CardTitle>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span>Customer: {customerInfo.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              <span>
                Vehicle: {assessmentData.vehicleInfo.year} {assessmentData.vehicleInfo.make}{" "}
                {assessmentData.vehicleInfo.model}
              </span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Approval Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Approval Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {approvalData.steps.map((step, index) => (
              <div key={step.id} className="flex items-start gap-4 p-4 border rounded-lg">
                <div className="flex-shrink-0 mt-1">{getStepIcon(step, index)}</div>
                <div className="flex-1">
                  <h4 className="font-medium">{step.title}</h4>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                  {step.completed && step.completedAt && (
                    <p className="text-xs text-green-600 mt-1">
                      Completed on {new Date(step.completedAt).toLocaleDateString()} by {step.completedBy}
                    </p>
                  )}
                  {step.comments && (
                    <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                      <strong>Comments:</strong> {step.comments}
                    </div>
                  )}
                  {step.signature && (
                    <div className="mt-2">
                      <SignatureVerification
                        signature={step.signature}
                        verificationStatus="verified"
                        showDetails={false}
                      />
                    </div>
                  )}
                </div>
                {index === currentStep && !step.completed && !readOnly && (
                  <Button
                    size="sm"
                    onClick={() => {
                      if (step.id === "final_signature") {
                        setShowSignatureDialog(true)
                      } else {
                        handleStepComplete(step.id)
                      }
                    }}
                  >
                    Complete
                  </Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Comments Section */}
      {!readOnly && !isApproved && (
        <Card>
          <CardHeader>
            <CardTitle>Comments</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <Label htmlFor="comments">Additional Comments or Concerns</Label>
                <Textarea
                  id="comments"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Enter any comments, questions, or concerns about this assessment..."
                  rows={4}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      {!readOnly && !isApproved && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={handleRejectAssessment} disabled={isSubmitting}>
                <XCircle className="h-4 w-4 mr-1" />
                Reject Assessment
              </Button>
              <Button variant="outline" onClick={handleRequestChanges} disabled={isSubmitting}>
                <Clock className="h-4 w-4 mr-1" />
                Request Changes
              </Button>
              {allStepsCompleted && (
                <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
                  <DialogTrigger asChild>
                    <Button disabled={isSubmitting}>
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Sign & Approve
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Final Approval & Digital Signature</DialogTitle>
                      <DialogDescription>
                        Please review the assessment one final time and provide your digital signature to approve.
                      </DialogDescription>
                    </DialogHeader>
                    <DigitalSignaturePad
                      onSignatureComplete={handleSignatureComplete}
                      onCancel={() => setShowSignatureDialog(false)}
                      signerName={customerInfo.name}
                      signerEmail={customerInfo.email}
                      title="Assessment Approval Signature"
                      description={`I approve the assessment for ${assessmentData.vehicleInfo.year} ${assessmentData.vehicleInfo.make} ${assessmentData.vehicleInfo.model} with a total estimate of $${assessmentData.pricingBreakdown.total.toFixed(2)}.`}
                      disabled={isSubmitting}
                    />
                  </DialogContent>
                </Dialog>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final Signature Display */}
      {isApproved && approvalData.finalSignature && (
        <Card>
          <CardHeader>
            <CardTitle>Approved Assessment</CardTitle>
          </CardHeader>
          <CardContent>
            <SignatureVerification
              signature={approvalData.finalSignature}
              verificationStatus="verified"
              showDetails={true}
            />
            {approvalData.approvalComments && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <h4 className="font-medium text-green-800">Approval Comments</h4>
                <p className="text-sm text-green-700 mt-1">{approvalData.approvalComments}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
