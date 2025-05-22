"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useOrganizationList } from "@clerk/nextjs"
import { Navbar } from "@/components/navbar"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Building, Loader2 } from "lucide-react"
import { handleError } from "@/lib/error-handling"

export default function CreateOrganizationPage() {
  const [name, setName] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { createOrganization } = useOrganizationList()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const organization = await createOrganization({ name })
      router.push("/dashboard")
    } catch (error) {
      handleError(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-1 container py-10 flex items-center justify-center">
        <Card className="w-full max-w-md shadow-neon">
          <CardHeader>
            <CardTitle className="text-[#00ae98] neon-text">Create Organization</CardTitle>
            <CardDescription className="text-secondary">
              Create a new organization to collaborate with others
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-[#00ae98]">
                    Organization Name
                  </Label>
                  <Input
                    id="name"
                    placeholder="Enter organization name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="border-secondary focus:border-[#00ae98] focus-visible:ring-[#00ae98]"
                  />
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-[#00ae98] hover:bg-[#00ae98]/90 text-white"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Building className="mr-2 h-4 w-4" />
                    Create Organization
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </main>
    </div>
  )
}
