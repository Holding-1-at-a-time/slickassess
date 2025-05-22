"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { ClientInfo } from "@/hooks/useSelfAssessmentForm"

interface StepOneProps {
  clientInfo: ClientInfo
  updateClientInfo: (field: keyof ClientInfo, value: string) => void
  nextStep: () => void
}

export function StepOne({ clientInfo, updateClientInfo, nextStep }: StepOneProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Contact Information</h2>

      <div className="space-y-2">
        <Label htmlFor="name">
          Full Name <span className="text-red-500">*</span>
        </Label>
        <Input
          id="name"
          value={clientInfo.name}
          onChange={(e) => updateClientInfo("name", e.target.value)}
          placeholder="John Doe"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">
          Email Address <span className="text-red-500">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          value={clientInfo.email}
          onChange={(e) => updateClientInfo("email", e.target.value)}
          placeholder="john@example.com"
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          value={clientInfo.phone}
          onChange={(e) => updateClientInfo("phone", e.target.value)}
          placeholder="(555) 123-4567"
        />
      </div>

      <div className="pt-4">
        <Button onClick={nextStep} className="w-full">
          Next: Vehicle Details
        </Button>
      </div>
    </div>
  )
}
