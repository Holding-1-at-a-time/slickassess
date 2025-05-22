"use client"

import { useState, useEffect } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useParams, useRouter } from "next/navigation"
import { withAuth } from "@/components/with-auth"
import { toast } from "sonner"

function ReminderSettingsPage() {
  const { clientId } = useParams() as { clientId: string }
  const router = useRouter()

  const prefs = useQuery(api.userClientPreferences.getByClientId, { clientId })
  const upsertMutation = useMutation(api.userClientPreferences.upsert)

  const [preferredDays, setPreferredDays] = useState<string[]>([])
  const [preferredTimeOfDay, setPreferredTimeOfDay] = useState("morning")
  const [preferredStaffId, setPreferredStaffId] = useState("")
  const [communicationPreference, setCommunicationPreference] = useState("email")
  const [reminderTiming, setReminderTiming] = useState(24)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (prefs) {
      setPreferredDays(prefs.preferredDays || [])
      setPreferredTimeOfDay(prefs.preferredTimeOfDay || "morning")
      setPreferredStaffId(prefs.preferredStaffId || "")
      setCommunicationPreference(prefs.communicationPreference || "email")
      setReminderTiming(prefs.reminderTiming || 24)
    }
  }, [prefs])

  async function handleSave() {
    setIsSaving(true)
    try {
      await upsertMutation({
        clientId,
        preferredDays,
        preferredTimeOfDay,
        preferredStaffId,
        communicationPreference,
        reminderTiming,
      })
      toast.success("Preferences saved.")
    } catch (err: any) {
      toast.error(err.message || "Failed to save preferences.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold mb-4">Reminder & Communication Preferences</h1>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium">Preferred Days</label>
          <div className="mt-1 flex flex-wrap gap-2">
            {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"].map((day) => (
              <button
                key={day}
                type="button"
                onClick={() => {
                  setPreferredDays((prev) => (prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]))
                }}
                className={`px-3 py-1 border rounded ${
                  preferredDays.includes(day) ? "bg-primary text-white" : "bg-neutral-100 dark:bg-neutral-800"
                }`}
              >
                {day.slice(0, 3)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium">Preferred Time of Day</label>
          <select
            value={preferredTimeOfDay}
            onChange={(e) => setPreferredTimeOfDay(e.target.value)}
            className="mt-1 block w-full border rounded p-2"
          >
            <option value="morning">Morning (8am–12pm)</option>
            <option value="afternoon">Afternoon (12pm–4pm)</option>
            <option value="evening">Evening (4pm–8pm)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Preferred Staff</label>
          <input
            type="text"
            value={preferredStaffId}
            onChange={(e) => setPreferredStaffId(e.target.value)}
            placeholder="Enter staff ID or name"
            className="mt-1 block w-full border rounded p-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Communication Preference</label>
          <select
            value={communicationPreference}
            onChange={(e) => setCommunicationPreference(e.target.value)}
            className="mt-1 block w-full border rounded p-2"
          >
            <option value="email">Email</option>
            <option value="sms">SMS</option>
            <option value="none">None</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Reminder Timing (hours before)</label>
          <input
            type="number"
            value={reminderTiming}
            onChange={(e) => setReminderTiming(Number(e.target.value))}
            className="mt-1 block w-full border rounded p-2"
          />
        </div>

        <div className="pt-4 flex justify-end space-x-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 bg-neutral-200 dark:bg-neutral-700 rounded"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 bg-primary text-white rounded hover:bg-primary-dark disabled:opacity-50"
          >
            {isSaving ? "Saving..." : "Save Preferences"}
          </button>
        </div>
      </div>
    </div>
  )
}

export default withAuth(ReminderSettingsPage, ["admin", "staff"])
