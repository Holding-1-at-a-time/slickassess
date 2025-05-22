"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/components/ui/use-toast"
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react"
import { AIFeedbackForm } from "@/components/ai-feedback-form"
import type { Id } from "@/convex/_generated/dataModel"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"

interface AIVehicleAnalyzerProps {
  imageUrl: string
  imageId: Id<"vehicleImages">
  vehicleId: Id<"vehicles">
  assessmentId?: Id<"assessments">
  onAnalysisComplete?: (analysisType: string, results: any) => void
}

export function AIVehicleAnalyzer({
  imageUrl,
  imageId,
  vehicleId,
  assessmentId,
  onAnalysisComplete,
}: AIVehicleAnalyzerProps) {
  const [activeTab, setActiveTab] = useState<"exterior" | "interior">("exterior")
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [analysisResults, setAnalysisResults] = useState<Record<string, any>>({})
  const [error, setError] = useState<string | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)

  const toast = useToast()

  const handleAnalyze = async () => {
    setIsAnalyzing(true)
    setProgress(0)
    setError(null)

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 95) {
          clearInterval(progressInterval)
          return prev
        }
        return prev + 5
      })
    }, 500)

    try {
      const response = await fetch("/api/ai/analyze-vehicle-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
          imageId,
          vehicleId,
          assessmentId,
          analysisType: activeTab,
        }),
      })

      clearInterval(progressInterval)
      setProgress(100)

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to analyze image")
      }

      const data = await response.json()

      // Store results by tab
      setAnalysisResults((prev) => ({
        ...prev,
        [activeTab]: data.result,
      }))

      toast({
        title: "Analysis Complete",
        description: `Vehicle ${activeTab} analysis completed successfully.`,
      })

      if (onAnalysisComplete) {
        onAnalysisComplete(activeTab, data.result)
      }

      setShowFeedback(true)
    } catch (error: any) {
      clearInterval(progressInterval)
      setProgress(0)
      setError(error.message || "An error occurred during analysis")

      toast({
        title: "Analysis Failed",
        description: error.message || "Failed to analyze image",
        variant: "destructive",
      })
    } finally {
      setIsAnalyzing(false)
    }
  }

  const renderResults = () => {
    const results = analysisResults[activeTab]
    if (!results) return null

    if (activeTab === "exterior") {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Overall Condition:</h3>
            <Badge variant={getConditionVariant(results.overallCondition)}>{results.overallCondition}</Badge>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Damage Summary:</h3>
            <p className="text-sm text-muted-foreground">{results.summary}</p>
          </div>

          {results.damages && results.damages.length > 0 ? (
            <div>
              <h3 className="text-lg font-medium mb-2">Detected Issues ({results.damages.length}):</h3>
              <div className="space-y-2">
                {results.damages.map((damage: any, index: number) => (
                  <Card key={index} className="p-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {damage.type} - {damage.severity}
                        </p>
                        <p className="text-sm text-muted-foreground">Location: {damage.location}</p>
                        <p className="text-sm text-muted-foreground">
                          Size: {damage.size}, Repair: {damage.repairComplexity}
                        </p>
                      </div>
                      <Badge variant={getSeverityVariant(damage.severity)}>{damage.severity}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center p-4 border rounded-md">
              <p>No damage detected</p>
            </div>
          )}

          {results.recommendations && results.recommendations.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-2">Recommendations:</h3>
              <ul className="list-disc pl-5 space-y-1">
                {results.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="text-sm">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )
    } else {
      return (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Overall Cleanliness:</h3>
            <Badge variant={getCleanlinessVariant(results.overallCleanliness)}>{results.overallCleanliness}</Badge>
          </div>

          <div>
            <h3 className="text-lg font-medium mb-2">Interior Summary:</h3>
            <p className="text-sm text-muted-foreground">{results.summary}</p>
          </div>

          {results.issues && results.issues.length > 0 ? (
            <div>
              <h3 className="text-lg font-medium mb-2">Detected Issues ({results.issues.length}):</h3>
              <div className="space-y-2">
                {results.issues.map((issue: any, index: number) => (
                  <Card key={index} className="p-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium">
                          {issue.type} - {issue.severity}
                        </p>
                        <p className="text-sm text-muted-foreground">Location: {issue.location}</p>
                        <p className="text-sm text-muted-foreground">Recommendation: {issue.recommendation}</p>
                      </div>
                      <Badge variant={getSeverityVariant(issue.severity)}>{issue.severity}</Badge>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center p-4 border rounded-md">
              <p>No issues detected</p>
            </div>
          )}

          {results.recommendations && results.recommendations.length > 0 && (
            <div>
              <h3 className="text-lg font-medium mb-2">Cleaning Recommendations:</h3>
              <ul className="list-disc pl-5 space-y-1">
                {results.recommendations.map((rec: string, index: number) => (
                  <li key={index} className="text-sm">
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>AI Vehicle Analysis</CardTitle>
        <CardDescription>Analyze vehicle {activeTab} condition using advanced AI</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "exterior" | "interior")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="exterior">Exterior Damage</TabsTrigger>
            <TabsTrigger value="interior">Interior Cleanliness</TabsTrigger>
          </TabsList>

          <TabsContent value="exterior" className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground">
              Detect scratches, dents, rust, and other exterior damage
            </div>

            {analysisResults.exterior ? (
              renderResults()
            ) : (
              <div className="text-center p-6 border rounded-md">
                <p className="mb-2">Click analyze to detect exterior damage</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="interior" className="space-y-4 mt-4">
            <div className="text-sm text-muted-foreground">Assess interior cleanliness, stains, wear, and damage</div>

            {analysisResults.interior ? (
              renderResults()
            ) : (
              <div className="text-center p-6 border rounded-md">
                <p className="mb-2">Click analyze to assess interior condition</p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {isAnalyzing && (
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm">Analyzing {activeTab}...</span>
              <span className="text-sm">{progress}%</span>
            </div>
            <Progress value={progress} className="h-2" />
          </div>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center text-red-800">
            <AlertCircle className="h-5 w-5 mr-2 flex-shrink-0" />
            <p className="text-sm">{error}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => {
            setAnalysisResults((prev) => ({
              ...prev,
              [activeTab]: null,
            }))
            setShowFeedback(false)
          }}
          disabled={isAnalyzing || !analysisResults[activeTab]}
        >
          Reset
        </Button>
        <Button onClick={handleAnalyze} disabled={isAnalyzing}>
          {isAnalyzing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Analyzing...
            </>
          ) : analysisResults[activeTab] ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Re-Analyze
            </>
          ) : (
            "Analyze Image"
          )}
        </Button>
      </CardFooter>

      {showFeedback && analysisResults[activeTab] && (
        <div className="px-6 pb-6">
          <AIFeedbackForm
            imageId={imageId}
            assessmentId={assessmentId}
            originalPredictions={
              activeTab === "exterior"
                ? (analysisResults.exterior?.damages || []).map((d: any) => ({
                    ...d,
                    id: d.id || crypto.randomUUID(),
                    confidence: 0.9,
                    boundingBox: d.boundingBox,
                    category: d.type,
                    severity: d.severity,
                  }))
                : (analysisResults.interior?.issues || []).map((i: any) => ({
                    ...i,
                    id: i.id || crypto.randomUUID(),
                    confidence: 0.9,
                    boundingBox: i.boundingBox,
                    category: i.type,
                    severity: i.severity,
                  }))
            }
            currentAnnotations={[]}
            onFeedbackSubmitted={() => setShowFeedback(false)}
          />
        </div>
      )}
    </Card>
  )
}

// Helper functions for badge variants
function getSeverityVariant(severity: string): "default" | "destructive" | "outline" | "secondary" {
  switch (severity.toLowerCase()) {
    case "minor":
      return "secondary"
    case "moderate":
      return "default"
    case "severe":
      return "destructive"
    default:
      return "outline"
  }
}

function getConditionVariant(condition: string): "default" | "destructive" | "outline" | "secondary" | "success" {
  switch (condition.toLowerCase()) {
    case "excellent":
      return "success"
    case "good":
      return "secondary"
    case "fair":
      return "default"
    case "poor":
      return "destructive"
    default:
      return "outline"
  }
}

function getCleanlinessVariant(cleanliness: string): "default" | "destructive" | "outline" | "secondary" | "success" {
  switch (cleanliness.toLowerCase()) {
    case "immaculate":
      return "success"
    case "clean":
      return "secondary"
    case "average":
      return "default"
    case "dirty":
      return "destructive"
    case "extremely dirty":
      return "destructive"
    default:
      return "outline"
  }
}
