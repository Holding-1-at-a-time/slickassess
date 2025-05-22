import { mutation, query } from "./_generated/server"
import { v } from "convex/values"
import { requireAuth } from "./utils/auth"

/**
 * Fetches all data needed for a damage report
 */
export const getDamageReportData = query({
  args: {
    assessmentId: v.id("assessments"),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await requireAuth(ctx)

    // Get the assessment
    const assessment = await ctx.db.get(args.assessmentId)
    if (!assessment || assessment.orgId !== orgId) {
      throw new Error("Assessment not found or access denied")
    }

    // Get the vehicle
    const vehicle = await ctx.db.get(assessment.vehicleId)
    if (!vehicle) {
      throw new Error("Vehicle not found")
    }

    // Get the client
    const client = await ctx.db.get(vehicle.clientId)
    if (!client) {
      throw new Error("Client not found")
    }

    // Get the user who created the assessment
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkId", (q) => q.eq("clerkId", assessment.clerkId))
      .unique()

    // Get the damage annotations
    const imageAnnotations = await ctx.db
      .query("imageAnnotations")
      .withIndex("by_assessmentId", (q) => q.eq("assessmentId", args.assessmentId))
      .collect()

    // Get the images for this assessment
    const images = await ctx.db
      .query("vehicleImages")
      .withIndex("by_vehicleId", (q) => q.eq("vehicleId", assessment.vehicleId))
      .collect()

    // Map annotations to damage objects
    const damages = imageAnnotations.flatMap((annotation) => {
      // Find the image for this annotation
      const image = images.find((img) => img._id === annotation.imageId)

      // Map each annotation to a damage object
      return annotation.annotations.map((anno) => ({
        id: anno.id,
        type: anno.category || "Unknown",
        severity: anno.severity || "Unknown",
        location: getLocationDescription(anno.type, anno.x, anno.y),
        description: anno.text || undefined,
        confidence: anno.confidence,
        imageUrl: image?.url,
      }))
    })

    // Get recommendations from the assessment
    const recommendations =
      assessment.recommendedServices?.map((rec) => ({
        id: rec.id || crypto.randomUUID(),
        service: rec.name,
        description: rec.description,
        priority: rec.priority,
        estimatedCost: rec.estimatedCost,
      })) || []

    // Get organization details
    const org = {
      name: "Your Organization", // In a real implementation, fetch this from Clerk
      logo: undefined, // In a real implementation, fetch this from your database
    }

    // Return the complete report data
    return {
      vehicle: {
        id: vehicle._id,
        make: vehicle.make,
        model: vehicle.model,
        year: vehicle.year,
        vin: vehicle.vin,
        licensePlate: vehicle.licensePlate,
        color: vehicle.color,
        mileage: vehicle.mileage,
      },
      client: {
        id: client._id,
        name: client.name,
        email: client.email,
        phone: client.phone,
      },
      assessment: {
        id: assessment._id,
        assessmentNumber: assessment.assessmentNumber || `ASS-${assessment._id.slice(-5)}`,
        assessmentDate: assessment.assessmentDate || assessment.createdAt,
        status: assessment.status,
        completedAt: assessment.completedAt,
        notes: assessment.notes,
        overallCondition: assessment.overallCondition,
        aiSummary: assessment.aiSummary,
      },
      damages,
      recommendations,
      metadata: {
        generatedBy: user?.name || assessment.clerkId,
        generatedAt: Date.now(),
        organizationName: org.name,
        organizationLogo: org.logo,
      },
    }
  },
})

/**
 * Creates a report record in the database
 */
export const createReport = mutation({
  args: {
    assessmentId: v.id("assessments"),
    reportUrl: v.string(),
    reportType: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId, orgId } = await requireAuth(ctx)
    const now = Date.now()

    // Get the assessment
    const assessment = await ctx.db.get(args.assessmentId)
    if (!assessment || assessment.orgId !== orgId) {
      throw new Error("Assessment not found or access denied")
    }

    // Create the report record
    const reportId = await ctx.db.insert("reports", {
      assessmentId: args.assessmentId,
      vehicleId: assessment.vehicleId,
      clientId: assessment.clientId,
      reportUrl: args.reportUrl,
      reportType: args.reportType,
      orgId,
      clerkId: userId,
      createdAt: now,
    })

    // Log the action
    await ctx.db.insert("auditLogs", {
      orgId,
      clerkId: userId,
      action: "createReport",
      resourceType: "report",
      resourceId: reportId,
      createdAt: now,
    })

    return reportId
  },
})

/**
 * Helper function to get a human-readable location description
 */
function getLocationDescription(type: string, x: number, y: number): string {
  // This is a simplified implementation
  // In a real application, you would use more sophisticated logic
  // to determine the location based on the vehicle part

  // Assuming the image is divided into a 3x3 grid
  const xSection = x < 300 ? "left" : x < 500 ? "center" : "right"
  const ySection = y < 200 ? "front" : y < 400 ? "middle" : "rear"

  return `${ySection} ${xSection}`
}
