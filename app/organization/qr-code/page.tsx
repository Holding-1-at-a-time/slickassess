"use client"

import { useState } from "react"
import { auth } from "@clerk/nextjs/server"
import { redirect } from "next/navigation"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, Download, RefreshCw } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function QrCodePage() {
  const { toast } = useToast()
  const [isRegenerating, setIsRegenerating] = useState(false)

  const tenant = useQuery(api.tenants.getByOrgId, {
    orgId: auth().orgId || "",
  })

  const regenerateQrCode = useMutation(api.tenants.regenerateQrCode)

  if (!auth().userId) {
    redirect("/sign-in")
  }

  if (!auth().orgId) {
    redirect("/organization/create")
  }

  // Check if user has admin role
  const isAdmin = auth().orgRole === "admin" || auth().orgRole === "org:admin"

  if (!isAdmin) {
    redirect("/dashboard")
  }

  const handleRegenerateQrCode = async () => {
    if (!tenant) return

    setIsRegenerating(true)
    try {
      await regenerateQrCode({ tenantId: tenant._id })
      toast({
        title: "QR Code Regenerated",
        description: "Your QR code has been successfully regenerated.",
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to regenerate QR code. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleDownloadQrCode = () => {
    if (!tenant?.qrCodeUrl) return

    const link = document.createElement("a")
    link.href = tenant.qrCodeUrl
    link.download = `${tenant.name.replace(/\s+/g, "-").toLowerCase()}-qr-code.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-10">
        <h1 className="text-3xl font-bold mb-6 text-[#00ae98] neon-text">QR Code Management</h1>

        <Card className="max-w-md mx-auto shadow-neon">
          <CardHeader>
            <CardTitle className="text-[#00ae98] neon-text">Your QR Code</CardTitle>
            <CardDescription>Customers can scan this QR code to access your self-assessment form.</CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center">
            {!tenant ? (
              <div className="py-10 flex flex-col items-center">
                <Loader2 className="h-8 w-8 animate-spin text-[#00ae98]" />
                <p className="mt-4">Loading your QR code...</p>
              </div>
            ) : tenant.qrCodeUrl ? (
              <div className="flex flex-col items-center">
                <div className="border-4 border-[#00ae98] rounded-lg p-2 bg-white">
                  <img src={tenant.qrCodeUrl || "/placeholder.svg"} alt="QR Code" className="w-64 h-64" />
                </div>
                <p className="mt-4 text-sm text-center">
                  Public URL:{" "}
                  <span className="font-mono text-xs break-all">
                    {process.env.NEXT_PUBLIC_APP_URL}/scan/{tenant.qrSlug}
                  </span>
                </p>
              </div>
            ) : (
              <p>No QR code found. Please regenerate your QR code.</p>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-2">
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={handleDownloadQrCode} disabled={!tenant?.qrCodeUrl}>
                <Download className="mr-2 h-4 w-4" />
                Download
              </Button>

              <Button className="flex-1" onClick={handleRegenerateQrCode} disabled={isRegenerating || !tenant}>
                {isRegenerating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Regenerating...
                  </>
                ) : (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Regenerate
                  </>
                )}
              </Button>
            </div>

            <p className="text-xs text-gray-500 text-center mt-2">
              Note: Regenerating will invalidate your previous QR code.
            </p>
          </CardFooter>
        </Card>
      </main>
    </div>
  )
}
