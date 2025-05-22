/**
 * Calls the AI damage detection API to analyze a vehicle image
 */
export async function detectVehicleDamage(imageUrl: string, imageId: string, vehicleId: string, assessmentId?: string) {
  try {
    const response = await fetch("/api/ai/detect-damage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        imageUrl,
        imageId,
        vehicleId,
        assessmentId,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      throw new Error(errorData.error || "Failed to detect vehicle damage")
    }

    return await response.json()
  } catch (error: any) {
    console.error("Error detecting vehicle damage:", error)
    throw error
  }
}
