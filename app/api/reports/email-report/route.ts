import type React from "react"
import { NextResponse } from "next/server"
import { Resend } from "resend"

import { EmailTemplate } from "@/components/emails/email-template"

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { assessmentData, customerInfo, businessInfo, reportNumber, generatedDate, email } = body

    // Generate PDF report using relative path for server-side call
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || `http://localhost:${process.env.PORT || 3000}`
    const pdfResponse = await fetch(`${baseUrl}/api/reports/generate-pdf`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        assessmentData,
        customerInfo,
        businessInfo,
        reportNumber,
        generatedDate,
      }),
    })

    if (!pdfResponse.ok) {
      console.error("PDF generation failed:", pdfResponse.status, pdfResponse.statusText)
      return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()

    await resend.emails.send({
      from: "Acme <onboarding@resend.dev>",
      to: [email],
      subject: "Your Report is Ready!",
      attachments: [
        {
          filename: `report-${reportNumber}.pdf`,
          content: Buffer.from(pdfBuffer),
        },
      ],
      react: EmailTemplate({ firstName: customerInfo.firstName, reportNumber: reportNumber }) as React.ReactElement,
    })

    return NextResponse.json({
      status: "Success",
    })
  } catch (error) {
    console.error("Email sending failed:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}
