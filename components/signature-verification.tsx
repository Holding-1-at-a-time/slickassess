"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { CheckCircle, AlertCircle, Download, Eye } from "lucide-react"
import type { SignatureData } from "./digital-signature-pad"

interface SignatureVerificationProps {
  signature: SignatureData
  verificationStatus: "verified" | "pending" | "invalid"
  onViewSignature?: () => void
  onDownloadCertificate?: () => void
  showDetails?: boolean
}

export function SignatureVerification({
  signature,
  verificationStatus,
  onViewSignature,
  onDownloadCertificate,
  showDetails = true,
}: SignatureVerificationProps) {
  const getStatusColor = () => {
    switch (verificationStatus) {
      case "verified":
        return "bg-green-100 text-green-800 border-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 border-yellow-200"
      case "invalid":
        return "bg-red-100 text-red-800 border-red-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
    }
  }

  const getStatusIcon = () => {
    switch (verificationStatus) {
      case "verified":
        return <CheckCircle className="h-4 w-4" />
      case "pending":
      case "invalid":
        return <AlertCircle className="h-4 w-4" />
      default:
        return null
    }
  }

  const getStatusText = () => {
    switch (verificationStatus) {
      case "verified":
        return "Signature Verified"
      case "pending":
        return "Verification Pending"
      case "invalid":
        return "Signature Invalid"
      default:
        return "Unknown Status"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZoneName: "short",
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Digital Signature</span>
          <Badge className={`${getStatusColor()} flex items-center gap-1`}>
            {getStatusIcon()}
            {getStatusText()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Signature Preview */}
        <div className="flex items-center justify-center p-4 border border-gray-200 rounded-lg bg-gray-50">
          <img
            src={signature.signature || "/placeholder.svg"}
            alt="Digital Signature"
            className="max-h-20 max-w-full object-contain"
            style={{ filter: "contrast(1.2)" }}
          />
        </div>

        {/* Signer Information */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Signed By</p>
            <p className="text-sm text-gray-900">{signature.signerName}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Email</p>
            <p className="text-sm text-gray-900">{signature.signerEmail}</p>
          </div>
          {signature.signerTitle && (
            <div>
              <p className="text-sm font-medium text-gray-700">Title</p>
              <p className="text-sm text-gray-900">{signature.signerTitle}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-700">Signed On</p>
            <p className="text-sm text-gray-900">{formatDate(signature.signedAt)}</p>
          </div>
        </div>

        {/* Technical Details */}
        {showDetails && (
          <div className="border-t pt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Technical Details</p>
            <div className="grid grid-cols-1 gap-2 text-xs text-gray-600">
              <div>
                <span className="font-medium">Signature Hash:</span> {signature.signatureHash}
              </div>
              {signature.ipAddress && (
                <div>
                  <span className="font-medium">IP Address:</span> {signature.ipAddress}
                </div>
              )}
              <div>
                <span className="font-medium">User Agent:</span>{" "}
                <span className="break-all">{signature.userAgent}</span>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {onViewSignature && (
            <Button variant="outline" size="sm" onClick={onViewSignature}>
              <Eye className="h-4 w-4 mr-1" />
              View Full Size
            </Button>
          )}
          {onDownloadCertificate && (
            <Button variant="outline" size="sm" onClick={onDownloadCertificate}>
              <Download className="h-4 w-4 mr-1" />
              Download Certificate
            </Button>
          )}
        </div>

        {/* Verification Notice */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-800">
            This digital signature has been cryptographically secured and timestamped. Any modifications to the document
            after signing will invalidate the signature.
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
