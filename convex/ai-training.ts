import { v } from "convex/values"
import { mutation } from "./_generated/server"

export const saveAnalysisResults = mutation({
  args: {
    imageId: v.id("images"),
    vehicleId: v.id("vehicles"),
    assessmentId: v.id("assessments"),
    analysisType: v.string(),
    results: v.any(),
  },
  handler: async (ctx, args) => {
    const userId = await ctx.auth.getUserIdentity()
    if (!userId) {
      throw new Error("Unauthorized")
    }

    const orgId = userId.orgId

    // Save the analysis results
    const analysisId = await ctx.db.insert("aiAnalysisResults", {
      imageId: args.imageId,
      vehicleId: args.vehicleId,
      assessmentId: args.assessmentId,
      analysisType: args.analysisType,
      results: args.results,
      orgId,
      createdBy: userId.subject,
      createdAt: Date.now(),
    })

    // Update the assessment with the analysis results
    const assessment = await ctx.db.get(args.assessmentId)
    if (!assessment) {
      throw new Error("Assessment not found")
    }

    const updateData: {
      aiNotes?: string
      identifiedIssues?: {
        section: string
        severity: string
        description: string
        aiDetected: boolean
      }[]
    } = {}

    if (args.analysisType === "exterior") {
      // Add identified issues from damages with deduplication
      if (args.results.damages && args.results.damages.length > 0) {
        const existingIssues = assessment.identifiedIssues || []
        const newIssues = args.results.damages.map((damage: any) => ({
          section: "Exterior",
          severity: damage.severity,
          description: `${damage.type} on ${damage.location}`,
          aiDetected: true,
        }))

        // Deduplicate based on description
        const existingDescriptions = new Set(existingIssues.map((issue) => issue.description))
        const uniqueNewIssues = newIssues.filter((issue) => !existingDescriptions.has(issue.description))

        updateData.identifiedIssues = [...existingIssues, ...uniqueNewIssues]
      }
    } else if (args.analysisType === "interior") {
      // Store AI-generated interior cleanliness notes in a dedicated field
      if (args.results.overallCleanliness) {
        updateData.aiNotes = `Interior Cleanliness: ${args.results.overallCleanliness}\n${args.results.summary || ""}`
      }

      // Add identified issues from interior problems with deduplication
      if (args.results.issues && args.results.issues.length > 0) {
        const existingIssues = assessment.identifiedIssues || []
        const newIssues = args.results.issues.map((issue: any) => ({
          section: "Interior",
          severity: issue.severity,
          description: `${issue.type} on ${issue.location}`,
          aiDetected: true,
        }))

        // Deduplicate based on description
        const existingDescriptions = new Set(existingIssues.map((issue) => issue.description))
        const uniqueNewIssues = newIssues.filter((issue) => !existingDescriptions.has(issue.description))

        updateData.identifiedIssues = [...existingIssues, ...uniqueNewIssues]
      }
    }

    if (Object.keys(updateData).length > 0) {
      await ctx.db.patch(args.assessmentId, updateData)
    }

    return analysisId
  },
})
