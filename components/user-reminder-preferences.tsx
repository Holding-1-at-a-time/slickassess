"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Trash2, Plus, Settings } from "lucide-react"
import { toast } from "sonner"

interface DefaultReminder {
  method: string
  minutes: number
}

export function UserReminderPreferences() {
  const preferences = useQuery(api.calendarEvents.getUserReminderPreferences)
  const updatePreferences = useMutation(api.calendarEvents.updateUserReminderPreferences)

  const [loading, setLoading] = useState(false)
  const [defaultReminders, setDefaultReminders] = useState<DefaultReminder[]>([])
  const [emailEnabled, setEmailEnabled] = useState(true)
  const [smsEnabled, setSmsEnabled] = useState(false)
  const [popupEnabled, setPopupEnabled] = useState(true)

  // Initialize state from preferences
  useState(() => {
    if (preferences) {
      setDefaultReminders(preferences.defaultReminders || [])
      setEmailEnabled(preferences.emailEnabled)
      setSmsEnabled(preferences.smsEnabled)
      setPopupEnabled(preferences.popupEnabled)
    }
  })

  const handleAddDefaultReminder = () => {
    setDefaultReminders([...defaultReminders, { method: "email", minutes: 60 }])
  }

  const handleRemoveDefaultReminder = (index: number) => {
    const newReminders = [...defaultReminders]
    newReminders.splice(index, 1)
    setDefaultReminders(newReminders)
  }

  const handleUpdateDefaultReminderMethod = (index: number, method: string) => {
    const newReminders = [...defaultReminders]
    newReminders[index].method = method
    setDefaultReminders(newReminders)
  }

  const handleUpdateDefaultReminderTime = (index: number, minutes: number) => {
    const newReminders = [...defaultReminders]
    newReminders[index].minutes = minutes
    setDefaultReminders(newReminders)
  }

  const handleSavePreferences = async () => {
    setLoading(true)
    try {
      await updatePreferences({
        defaultReminders,
        emailEnabled,
        smsEnabled,
        popupEnabled,
      })
      toast.success("Reminder preferences saved")
    } catch (error) {
      console.error("Error saving preferences:", error)
      toast.error("Failed to save preferences")
    } finally {
      setLoading(false)
    }
  }

  if (!preferences) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-center h-24">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Reminder Preferences
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h3 className="text-sm font-medium">Default Reminders</h3>
          <p className="text-sm text-muted-foreground">These reminders will be applied to new events by default.</p>

          {defaultReminders.length === 0 ? (
            <div className="text-center py-4 text-muted-foreground">No default reminders set.</div>
          ) : (
            defaultReminders.map((reminder, index) => (
              <div key={index} className="flex items-end gap-2">
                <div className="flex-1">
                  <Label htmlFor={`default-method-${index}`} className="text-xs">
                    Method
                  </Label>
                  <Select
                    value={reminder.method}
                    onValueChange={(value) => handleUpdateDefaultReminderMethod(index, value)}
                    disabled={loading}
                  >
                    <SelectTrigger id={`default-method-${index}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="popup">Popup</SelectItem>
                      <SelectItem value="sms">SMS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label htmlFor={`default-time-${index}`} className="text-xs">
                    Time before (minutes)
                  </Label>
                  <Input
                    id={`default-time-${index}`}
                    type="number"
                    min="1"
                    max="10080" // 1 week in minutes
                    value={reminder.minutes}
                    onChange={(e) => handleUpdateDefaultReminderTime(index, Number.parseInt(e.target.value))}
                    disabled={loading}
                  />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemoveDefaultReminder(index)}
                  disabled={loading}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))
          )}

          <Button
            variant="outline"
            className="w-full flex items-center gap-2"
            onClick={handleAddDefaultReminder}
            disabled={loading}
          >
            <Plus className="h-4 w-4" />
            Add Default Reminder
          </Button>
        </div>

        <div className="space-y-4">
          <h3 className="text-sm font-medium">Notification Methods</h3>
          <p className="text-sm text-muted-foreground">Enable or disable different notification methods.</p>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="email-enabled" className="flex items-center gap-2">
                Email Notifications
              </Label>
              <Switch id="email-enabled" checked={emailEnabled} onCheckedChange={setEmailEnabled} disabled={loading} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="sms-enabled" className="flex items-center gap-2">
                SMS Notifications
              </Label>
              <Switch id="sms-enabled" checked={smsEnabled} onCheckedChange={setSmsEnabled} disabled={loading} />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="popup-enabled" className="flex items-center gap-2">
                In-App Notifications
              </Label>
              <Switch id="popup-enabled" checked={popupEnabled} onCheckedChange={setPopupEnabled} disabled={loading} />
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={handleSavePreferences} disabled={loading}>
          {loading ? "Saving..." : "Save Preferences"}
        </Button>
      </CardFooter>
    </Card>
  )
}
