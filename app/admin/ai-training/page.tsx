"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "@/components/ui/use-toast"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { withAuth } from "@/components/with-auth"
import { Loader2, RefreshCw, Check, AlertTriangle } from "lucide-react"
import { format } from "date-fns"

function AITrainingPage() {
  const [isTraining, setIsTraining] = useState(false)

  // Get the active model version
  const activeModel = useQuery(api.aiTraining.getActiveModelVersion, {
    modelName: "damage-detection",
  })

  // Get recent feedback
  const recentFeedback = useQuery(api.aiTraining.getFeedbackForTraining, {
    limit: 10,
    since: Date.now() - 7 * 24 * 60 * 60 * 1000, // Last 7 days
  })

  // Mutations
  const initiateTrainingMutation = useMutation(api.aiTraining.initiateTraining)

  const handleStartTraining = async () => {
    setIsTraining(true)
    try {
      const result = await initiateTrainingMutation({
        modelName: "damage-detection",
        version: `1.0.${Date.now()}`,
      })

      toast({
        title: "Training Started",
        description: "AI model training has been initiated.",
      })
    } catch (error: any) {
      console.error("Error starting training:", error)
      toast({
        title: "Error",
        description: error.message || "Failed to start training",
        variant: "destructive",
      })
    } finally {
      setIsTraining(false)
    }
  }

  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">AI Training Management</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Current Model</CardTitle>
            <CardDescription>Information about the currently active AI model</CardDescription>
          </CardHeader>
          <CardContent>
            {activeModel ? (
              <div className="space-y-2">
                <p>
                  <strong>Model Name:</strong> {activeModel.modelName}
                </p>
                <p>
                  <strong>Version:</strong> {activeModel.version}
                </p>
                <p>
                  <strong>Accuracy:</strong> {(activeModel.accuracy * 100).toFixed(2)}%
                </p>
                <p>
                  <strong>Training Data:</strong> {activeModel.trainingDataCount.toLocaleString()} samples
                </p>
                {activeModel.deployedAt && (
                  <p>
                    <strong>Deployed:</strong> {format(activeModel.deployedAt, "PPpp")}
                  </p>
                )}
                <div className="flex items-center mt-4">
                  <Check className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-green-500 font-medium">Active</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <AlertTriangle className="h-8 w-8 text-amber-500 mx-auto mb-2" />
                <p className="text-muted-foreground">No active model found</p>
              </div>
            )}
          </CardContent>
          <CardFooter>
            <Button onClick={handleStartTraining} disabled={isTraining}>
              {isTraining ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Training...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Train New Model
                </>
              )}
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recent Feedback</CardTitle>
            <CardDescription>Recent feedback submitted for AI training</CardDescription>
          </CardHeader>
          <CardContent>
            {recentFeedback?.feedback && recentFeedback.feedback.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {recentFeedback.feedback.length} feedback entries in the last 7 days
                </p>
                <div className="border rounded-md overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                          Date
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                      {recentFeedback.feedback.map((feedback) => (
                        <tr key={feedback._id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                feedback.feedbackType === "confirmation"
                                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                                  : feedback.feedbackType === "correction"
                                    ? "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
                                    : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                              }`}
                            >
                              {feedback.feedbackType}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                            {format(feedback.createdAt, "PPp")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-muted-foreground">No recent feedback found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default withAuth(AITrainingPage, ["admin"])
