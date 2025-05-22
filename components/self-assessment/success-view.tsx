"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2 } from "lucide-react"

interface SuccessViewProps {
  resetForm: () => void
}

export function SuccessView({ resetForm }: SuccessViewProps) {
  return (
    <Card className="w-full">
      <CardContent className="pt-6">
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Assessment Submitted!</h2>
          <p className="text-gray-600 mb-6">
            Thank you for submitting your vehicle assessment. A representative will review your information and contact
            you soon.
          </p>
          <Button onClick={resetForm}>Submit Another Assessment</Button>
        </div>
      </CardContent>
    </Card>
  )
}
