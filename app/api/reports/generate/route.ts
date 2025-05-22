import { NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { generateDamageReport } from "@/lib/reports/damage-report-generator"

// Create a Convex client for server-side API calls
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(req: Request) {
  // Ensure authenticated
  const { userId, orgId } = auth()

  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  if (!orgId) {
    return NextResponse.json({ error: "No organization selected" }, { status: 400 })
  }

  try {
    // Parse JSON body
    const { assessmentId } = await req.json()

    if (!assessmentId) {
      return NextResponse.json({ error: "Assessment ID is required" }, { status: 400 })
    }

    // Get a JWT token for Convex authentication
    const token = await auth().getToken({ template: "convex" })

    if (!token) {
      return NextResponse.json({ error: "Failed to generate authentication token" }, { status: 500 })
    }

    // Fetch the report data from Convex
    const reportData = await convex.query(
      api.reports.getDamageReportData,
      { assessmentId },
      { authorization: `Bearer ${token}` },
    )

    // Generate the PDF report
    const pdfBytes = await generateDamageReport(reportData)

    // In a real implementation, you would upload the PDF to a storage service
    // and save the URL in the database. For this example, we'll just return the PDF.

    // Create a unique filename
    const filename = `damage-report-${reportData.assessment.assessmentNumber}-${Date.now()}.pdf`

    // Return the PDF as a response
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    })
  } catch (error: any) {
    console.error("Error generating report:", error)
    return NextResponse.json(
      {
        error: error.message || "Failed to generate report",
      },
      {
        status: 500,
      },
    )
  }
}
