"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import type { ClientInfoSchema } from "@/lib/validations/self-assessment-schema"
import { FormError } from "@/components/ui/form-error"

interface StepOneProps {
  clientInfo: ClientInfoSchema
  updateClientInfo: (field: keyof ClientInfoSchema, value: string) => void
  nextStep: () => void
  getFieldError: (field: string) => string | undefined
}

export function StepOne({ clientInfo, updateClientInfo, nextStep, getFieldError }: StepOneProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold mb-4">Contact Information</h2>

      <div className="space-y-2">
        <Label htmlFor="name" className="flex items-center justify-between">
          <span>
            Full Name <span className="text-red-500">*</span>
          </span>
        </Label>
        <Input
          id="name"
          value={clientInfo.name}
          onChange={(e) => updateClientInfo("name", e.target.value)}
          placeholder="John Doe"
          required
          className={getFieldError("name") ? "border-red-500" : ""}
        />
        {getFieldError("name") && <FormError message={getFieldError("name")} />}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="flex items-center justify-between">
          <span>
            Email Address <span className="text-red-500">*</span>
          </span>
        </Label>
        <Input
          id="email"
          type="email"
          value={clientInfo.email}
          onChange={(e) => updateClientInfo("email", e.target.value)}
          placeholder="john@example.com"
          required
          className={getFieldError("email") ? "border-red-500" : ""}
        />
        {getFieldError("email") && <FormError message={getFieldError("email")} />}
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number</Label>
        <Input
          id="phone"
          type="tel"
          value={clientInfo.phone || ""}
          onChange={(e) => updateClientInfo("phone", e.target.value)}
          placeholder="(555) 123-4567"
          className={getFieldError("phone") ? "border-red-500" : ""}
        />
        {getFieldError("phone") && <FormError message={getFieldError("phone")} />}
      </div>

      {getFieldError("form") && <FormError message={getFieldError("form")} />}

      <div className="pt-4">
        <Button onClick={nextStep} className="w-full">
          Next: Vehicle Details
        </Button>
      </div>
    </div>
  )
}
