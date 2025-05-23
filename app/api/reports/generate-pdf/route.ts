import { type NextRequest, NextResponse } from "next/server"
import { auth } from "@clerk/nextjs/server"
import { PDFDocument, rgb, StandardFonts } from "pdf-lib"
import { rateLimit } from "@/convex/utils/rate-limiter"

export async function POST(req: NextRequest) {
  try {
    // Check authentication
    const { userId, orgId } = auth()
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Apply rate limiting
    const rateLimitResult = await rateLimit({
      identifier: `pdf_generation_${userId}`,
      limit: 10,
      timeframe: 60 * 60, // 1 hour
    })

    if (!rateLimitResult.success) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 })
    }

    // Parse request body
    const body = await req.json()
    const { assessmentData, customerInfo, businessInfo, reportNumber, generatedDate } = body

    if (!assessmentData) {
      return NextResponse.json({ error: "Assessment data is required" }, { status: 400 })
    }

    // Generate PDF using pdf-lib
    const pdfDoc = await PDFDocument.create()
    const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman)
    const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)

    // Add a page
    const page = pdfDoc.addPage([612, 792]) // Letter size
    const { width, height } = page.getSize()

    // Header
    page.drawText("VEHICLE ASSESSMENT REPORT", {
      x: 50,
      y: height - 50,
      size: 18,
      font: timesRomanBoldFont,
      color: rgb(0, 0, 0),
    })

    // Report number and date
    page.drawText(`Report #: ${reportNumber}`, {
      x: 50,
      y: height - 80,
      size: 10,
      font: timesRomanFont,
      color: rgb(0.3, 0.3, 0.3),
    })

    page.drawText(`Generated: ${new Date(generatedDate).toLocaleDateString()}`, {
      x: 50,
      y: height - 95,
      size: 10,
      font: timesRomanFont,
      color: rgb(0.3, 0.3, 0.3),
    })

    // Business info if available
    let yPosition = height - 130
    if (businessInfo) {
      page.drawText(`${businessInfo.name}`, {
        x: 50,
        y: yPosition,
        size: 12,
        font: timesRomanBoldFont,
        color: rgb(0, 0, 0),
      })

      yPosition -= 15
      page.drawText(`${businessInfo.address}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      })

      yPosition -= 15
      page.drawText(`${businessInfo.phone} • ${businessInfo.email}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      })

      yPosition -= 30
    }

    // Customer info if available
    if (customerInfo) {
      page.drawText("Customer Information:", {
        x: 50,
        y: yPosition,
        size: 12,
        font: timesRomanBoldFont,
        color: rgb(0, 0, 0),
      })

      yPosition -= 20
      page.drawText(`Name: ${customerInfo.name}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      })

      yPosition -= 15
      page.drawText(`Email: ${customerInfo.email}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      })

      yPosition -= 15
      page.drawText(`Phone: ${customerInfo.phone}`, {
        x: 50,
        y: yPosition,
        size: 10,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      })

      yPosition -= 30
    }

    // Vehicle information
    page.drawText("Vehicle Information:", {
      x: 50,
      y: yPosition,
      size: 12,
      font: timesRomanBoldFont,
      color: rgb(0, 0, 0),
    })

    yPosition -= 20
    page.drawText(
      `Vehicle: ${assessmentData.vehicleInfo.year} ${assessmentData.vehicleInfo.make} ${assessmentData.vehicleInfo.model}`,
      {
        x: 50,
        y: yPosition,
        size: 10,
        font: timesRomanFont,
        color: rgb(0, 0, 0),
      },
    )

    yPosition -= 15
    page.drawText(`Body Type: ${assessmentData.vehicleInfo.bodyType}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    })

    yPosition -= 15
    page.drawText(`Size: ${assessmentData.vehicleInfo.size}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    })

    yPosition -= 30

    // Assessment Summary
    page.drawText("Assessment Summary:", {
      x: 50,
      y: yPosition,
      size: 12,
      font: timesRomanBoldFont,
      color: rgb(0, 0, 0),
    })

    yPosition -= 20
    page.drawText(`Overall Exterior Condition: ${assessmentData.exteriorAnalysis.overallCondition.toUpperCase()}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    })

    yPosition -= 15
    page.drawText(`Overall Interior Cleanliness: ${assessmentData.interiorAnalysis.overallCleanliness.toUpperCase()}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    })

    yPosition -= 15
    page.drawText(`Total Issues Found: ${assessmentData.exteriorAnalysis.totalDamageCount}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    })

    yPosition -= 15
    page.drawText(`Estimated Duration: ${assessmentData.estimatedDuration.total} hours`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    })

    yPosition -= 30

    // Pricing Breakdown
    page.drawText("Pricing Breakdown:", {
      x: 50,
      y: yPosition,
      size: 12,
      font: timesRomanBoldFont,
      color: rgb(0, 0, 0),
    })

    yPosition -= 20
    page.drawText(`Base Price: $${assessmentData.pricingBreakdown.basePrice.toFixed(2)}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    })

    yPosition -= 15
    page.drawText(`Subtotal: $${assessmentData.pricingBreakdown.subtotal.toFixed(2)}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    })

    yPosition -= 15
    page.drawText(`Taxes: $${assessmentData.pricingBreakdown.taxes.toFixed(2)}`, {
      x: 50,
      y: yPosition,
      size: 10,
      font: timesRomanFont,
      color: rgb(0, 0, 0),
    })

    yPosition -= 15
    page.drawText(`TOTAL ESTIMATE: $${assessmentData.pricingBreakdown.total.toFixed(2)}`, {
      x: 50,
      y: yPosition,
      size: 12,
      font: timesRomanBoldFont,
      color: rgb(0, 0, 0),
    })

    // Add more pages and content as needed for detailed breakdown
    // For a complete report, we would need multiple pages

    // Add a second page for detailed issues
    const page2 = pdfDoc.addPage([612, 792])
    let y2Position = height - 50

    page2.drawText("Detailed Assessment Findings", {
      x: 50,
      y: y2Position,
      size: 16,
      font: timesRomanBoldFont,
      color: rgb(0, 0, 0),
    })

    y2Position -= 30

    // Exterior Issues
    if (assessmentData.exteriorAnalysis.damages.length > 0) {
      page2.drawText("Exterior Issues:", {
        x: 50,
        y: y2Position,
        size: 12,
        font: timesRomanBoldFont,
        color: rgb(0, 0, 0),
      })

      y2Position -= 20

      assessmentData.exteriorAnalysis.damages.forEach((damage, index) => {
        const text = `${index + 1}. ${damage.description} - ${damage.severity.toUpperCase()} (+$${damage.priceImpact.toFixed(2)})`

        page2.drawText(text, {
          x: 50,
          y: y2Position,
          size: 10,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        })

        y2Position -= 15

        // Check if we need a new page
        if (y2Position < 100) {
          const newPage = pdfDoc.addPage([612, 792])
          page2 = newPage
          y2Position = height - 50
        }
      })

      y2Position -= 15
    }

    // Interior Issues
    if (assessmentData.interiorAnalysis.issues.length > 0) {
      page2.drawText("Interior Issues:", {
        x: 50,
        y: y2Position,
        size: 12,
        font: timesRomanBoldFont,
        color: rgb(0, 0, 0),
      })

      y2Position -= 20

      assessmentData.interiorAnalysis.issues.forEach((issue, index) => {
        const text = `${index + 1}. ${issue.description} - ${issue.severity.toUpperCase()} (+$${issue.priceImpact.toFixed(2)})`

        page2.drawText(text, {
          x: 50,
          y: y2Position,
          size: 10,
          font: timesRomanFont,
          color: rgb(0, 0, 0),
        })

        y2Position -= 15

        // Check if we need a new page
        if (y2Position < 100) {
          const newPage = pdfDoc.addPage([612, 792])
          y2Position = height - 50
        }
      })

      y2Position -= 15
    }

    // Footer on all pages
    const pageCount = pdfDoc.getPageCount()
    for (let i = 0; i < pageCount; i++) {
      const page = pdfDoc.getPage(i)
      const { width, height } = page.getSize()

      page.drawText("This assessment was generated using AI-powered analysis.", {
        x: 50,
        y: 50,
        size: 8,
        font: timesRomanFont,
        color: rgb(0.5, 0.5, 0.5),
      })

      page.drawText(`Page ${i + 1} of ${pageCount}`, {
        x: width - 100,
        y: 50,
        size: 8,
        font: timesRomanFont,
        color: rgb(0.5, 0.5, 0.5),
      })
    }

    // Serialize the PDFDocument to bytes
    const pdfBytes = await pdfDoc.save()

    // Return the PDF as a response
    return new NextResponse(pdfBytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="assessment-report-${reportNumber}.pdf"`,
      },
    })
  } catch (error) {
    console.error("Error generating PDF:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
