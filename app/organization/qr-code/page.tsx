"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { useAuth, useOrganization } from "@clerk/nextjs"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Download, RefreshCw, QrCode, AlertTriangle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

export default function QrCodePage() {
  const { toast } = useToast()
  const router = useRouter()
  const { userId, isLoaded: isAuthLoaded } = useAuth()
  const { organization, isLoaded: isOrgLoaded } = useOrganization()

  const tenant = useQuery(api.tenants.getByOrgId)
  const regenerateQrCode = useMutation(api.tenants.regenerateQrCode)
  const [regenerating, setRegenerating] = useState(false)
  const [appUrl, setAppUrl] = useState<string>("")

  // Check authentication and redirect if needed
  useEffect(() => {
    if (isAuthLoaded && !userId) {
      router.push("/sign-in")
    }

    if (isAuthLoaded && isOrgLoaded) {
      if (!organization) {
        router.push("/organization/create")
      } else {
        // Check if user has admin role
        const isAdmin = organization.membership?.role === "admin"
        if (!isAdmin) {
          router.push("/dashboard")
        }
      }
    }
  }, [isAuthLoaded, isOrgLoaded, userId, organization, router])

  // Get the app URL safely
  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    setAppUrl(url)
  }, [])

  const handleRegenerateQrCode = async () => {
    if (!tenant) {

    try {
      setRegenerating(true)
      await regenerateQrCode({ tenantId: tenant._id })
      toast({
        title: "QR Code Regenerated",
        description: "Your QR code has been successfully regenerated. Previous QR codes are now invalid.",
      })
    } catch (error) {
      console.error("Error regenerating QR code:", error)
      toast({
        title: "Error",
        description: "Failed to regenerate QR code. Please try again.",
        variant: "destructive",
      })
    } finally {
      setRegenerating(false)
    }
  }

  const handleDownloadQrCode = () => {
    if (!tenant?.qrCodeUrl) {

    // Create a temporary link element
    const link = document.createElement("a")
    link.href = tenant.qrCodeUrl
    link.download = `${tenant.name.replace(/\s+/g, "-").toLowerCase()}-qr-code.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Show loading state while checking auth
  if (!isAuthLoaded || !isOrgLoaded || !tenant) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-[#00AE98]" />
      </div>
    )
  }

  // Properly construct the public URL using template literals
  const publicUrl = `${appUrl}/scan/${tenant.activeQrSlug}`

  return (
    <div className="container py-8">
      {`${process.env.NEXT_PUBLIC_APP_URL}/scan/${tenant.qrSlug}`}

      <Tabs defaultValue="qr-code">
        <TabsList className="mb-6">
          <TabsTrigger value="qr-code">QR Code</TabsTrigger>
          <TabsTrigger value="usage">Usage Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="qr-code">
          <div className="grid md:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle>Your QR Code</CardTitle>
                <CardDescription>
                  Customers can scan this QR code to submit a self-assessment for their vehicle.
                </CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                {tenant.qrCodeUrl ? (
                  <div className="border border-gray-200 rounded-lg p-4 bg-white">
                    <img src={tenant.qrCodeUrl || "/placeholder.svg"} alt="QR Code" className="w-64 h-64" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-64 h-64 bg-gray-100 rounded-lg">
                    <Loader2 className="h-8 w-8 animate-spin" />
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col space-y-4">
                <div className="text-sm text-gray-500 text-center w-full mb-2">
                  <p>Public URL:</p>
                  <code className="bg-gray-100 px-2 py-1 rounded text-xs break-all">{publicUrl}</code>
                </div>
                <div className="flex gap-4 w-full">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={handleDownloadQrCode}
                    disabled={!tenant.qrCodeUrl}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download
                  </Button>
                  <Button variant="outline" className="flex-1" onClick={handleRegenerateQrCode} disabled={regenerating}>
                    {regenerating ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Regenerate
                  </Button>
                </div>
                <div className="flex items-center gap-2 text-amber-600 text-xs mt-2 bg-amber-50 p-2 rounded">
                  <AlertTriangle className="h-4 w-4" />
                  <span>Regenerating will invalidate all previously distributed QR codes.</span>
                </div>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>How to Use Your QR Code</CardTitle>
                <CardDescription>
                  Follow these steps to effectively use your QR code for customer self-assessments.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ol className="list-decimal list-inside space-y-4 text-sm">
                  <li>
                    <strong>Download your QR code</strong> by clicking the Download button.
                  </li>
                  <li>
                    <strong>Print the QR code</strong> and place it in visible locations such as:
                    <ul className="list-disc list-inside ml-6 mt-2">
                      <li>Your service counter or reception area</li>
                      <li>Business cards or brochures</li>
                      <li>Service bay entrances</li>
                      <li>Waiting areas</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Share digitally</strong> on your:
                    <ul className="list-disc list-inside ml-6 mt-2">
                      <li>Website</li>
                      <li>Social media profiles</li>
                      <li>Email signatures</li>
                      <li>Digital receipts</li>
                    </ul>
                  </li>
                  <li>
                    <strong>Instruct customers</strong> to scan the code with their smartphone camera and follow the
                    prompts to submit their vehicle information.
                  </li>
                  <li>
                    <strong>Review submissions</strong> in your dashboard under the Assessments section.
                  </li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="usage">
          <Card>
            <CardHeader>
              <CardTitle>QR Code Analytics</CardTitle>
              <CardDescription>Track how customers are using your QR code.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] flex items-center justify-center">
              <div className="text-center">
                <QrCode className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium">Analytics Coming Soon</h3>
                <p className="text-sm text-gray-500 mt-2">
                  We're working on adding detailed analytics for your QR code usage.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
