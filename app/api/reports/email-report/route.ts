import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { formatReportForPrint } from "@/lib/reports/assessment-report-generator"
import { rateLimit } from "@/convex/utils/rate-limiter"
import { generatePdfReport } from "@/lib/reports/pdf-generator" // Direct import of the handler

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const { userId, orgId } = auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimit({
      identifier: `email_report_${userId}`,
      limit: 20,
      timeframe: 60 * 60, // 1 hour
    })

    if (!rateLimitResult.success) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 })
    }

    // Parse request body
    const body = await req.json()
    const { assessmentData, emailAddress, customerInfo, businessInfo, reportNumber, generatedDate } = body

    if (!assessmentData || !emailAddress) {
      return NextResponse.json({ error: "Assessment data and email address are required" }, { status: 400 })
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(emailAddress)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 })
    }

    // Generate PDF report directly instead of using fetch
    const pdfBuffer = await generatePdfReport({
      assessmentData,
      customerInfo,
      businessInfo,
      reportNumber,
      generatedDate,
    })

    if (!pdfBuffer) {
      throw new Error("Failed to generate PDF report")
    }

    // Format text version for email body
    const textReport = formatReportForPrint(assessmentData)

    // Send email using Gmail API
    const vehicleInfo = `${assessmentData.vehicleInfo.year} ${assessmentData.vehicleInfo.make} ${assessmentData.vehicleInfo.model}`

    const emailData = {
      to: emailAddress,
      subject: `Vehicle Assessment Report - ${vehicleInfo} - ${reportNumber}`,
      text: textReport,
      html: `
        <h1>Vehicle Assessment Report</h1>
        <p>Please find attached your detailed vehicle assessment report for your ${vehicleInfo}.</p>
        <p><strong>Report Number:</strong> ${reportNumber}</p>
        <p><strong>Generated Date:</strong> ${new Date(generatedDate).toLocaleDateString()}</p>
        <p><strong>Total Estimate:</strong> $${assessmentData.pricingBreakdown.total.toFixed(2)}</p>
        <p>The attached PDF contains a comprehensive breakdown of all detected issues, pricing details, and service recommendations.</p>
        <p>If you have any questions about this assessment, please contact us.</p>
        <p>Thank you for your business!</p>
      `,
      attachments: [
        {
          filename: `assessment-report-${reportNumber}.pdf`,
          content: pdfBuffer,
          contentType: "application/pdf",
        },
      ],
    }

    // Call Gmail API to send email - using relative path
    const emailResponse = await fetch("/api/email/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    })

    if (!emailResponse.ok) {
      throw new Error("Failed to send email")
    }

    // Return success response
    return NextResponse.json({ success: true, message: "Assessment report emailed successfully" })
  } catch (error) {
    console.error("Error emailing report:", error)
    return NextResponse.json({ error: "Failed to email report" }, { status: 500 })
  }
}
