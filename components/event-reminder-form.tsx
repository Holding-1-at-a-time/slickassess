"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Trash2, Plus, Bell } from "lucide-react"
import { toast } from "sonner"

interface EventReminderFormProps {
  eventId: Id<"calendarEvents">
}

interface Reminder {
  id: string
  method: string
  minutes: number
  sent?: boolean
  sentAt?: number
}

export function EventReminderForm({ eventId }: EventReminderFormProps) {
  const event = useQuery(api.calendarEvents.getEventById, { eventId })
  const userPreferences = useQuery(api.calendarEvents.getUserReminderPreferences)
  const addReminder = useMutation(api.calendarEvents.addReminder)
  const removeReminder = useMutation(api.calendarEvents.removeReminder)
  const updateReminder = useMutation(api.calendarEvents.updateReminder)

  const [loading, setLoading] = useState(false)

  const handleAddReminder = async () => {
    setLoading(true)
    try {
      // Use first default reminder from user preferences
      const defaultReminder = userPreferences?.defaultReminders?.[0] || { method: "email", minutes: 60 }
      await addReminder({
        eventId,
        method: defaultReminder.method,
        minutes: defaultReminder.minutes,
      })
      toast.success("Reminder added")
    } catch (error) {
      console.error("Error adding reminder:", error)
      toast.error("Failed to add reminder")
    } finally {
      setLoading(false)
    }
  }

  const handleRemoveReminder = async (reminderId: string) => {
    setLoading(true)
    try {
      await removeReminder({ eventId, reminderId })
      toast.success("Reminder removed")
    } catch (error) {
      console.error("Error removing reminder:", error)
      toast.error("Failed to remove reminder")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateReminderMethod = async (reminderId: string, method: string) => {
    setLoading(true)
    try {
      const reminder = event?.reminders?.find((r) => r.id === reminderId)
      if (!reminder) return

      await updateReminder({
        eventId,
        reminderId,
        method,
        minutes: reminder.minutes,
      })
    } catch (error) {
      console.error("Error updating reminder method:", error)
      toast.error("Failed to update reminder")
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateReminderTime = async (reminderId: string, minutes: number) => {
    setLoading(true)
    try {
      const reminder = event?.reminders?.find((r) => r.id === reminderId)
      if (!reminder) return

      await updateReminder({
        eventId,
        reminderId,
        method: reminder.method,
        minutes,
      })
    } catch (error) {
      console.error("Error updating reminder time:", error)
      toast.error("Failed to update reminder")
    } finally {
      setLoading(false)
    }
  }

  if (!event) {
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

  const reminders = event.reminders || []

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" />
          Event Reminders
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {reminders.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">No reminders set for this event.</div>
        ) : (
          reminders.map((reminder) => (
            <div key={reminder.id} className="flex items-end gap-2">
              <div className="flex-1">
                <Label htmlFor={`method-${reminder.id}`} className="text-xs">
                  Method
                </Label>
                <Select
                  value={reminder.method}
                  onValueChange={(value) => handleUpdateReminderMethod(reminder.id, value)}
                  disabled={loading || reminder.sent}
                >
                  <SelectTrigger id={`method-${reminder.id}`}>
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
                <Label htmlFor={`time-${reminder.id}`} className="text-xs">
                  Time before (minutes)
                </Label>
                <Input
                  id={`time-${reminder.id}`}
                  type="number"
                  min="1"
                  max="10080" // 1 week in minutes
                  value={reminder.minutes}
                  onChange={(e) => handleUpdateReminderTime(reminder.id, Number.parseInt(e.target.value))}
                  disabled={loading || reminder.sent}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveReminder(reminder.id)}
                disabled={loading || reminder.sent}
                className="text-destructive"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          className="w-full flex items-center gap-2"
          onClick={handleAddReminder}
          disabled={loading}
        >
          <Plus className="h-4 w-4" />
          Add Reminder
        </Button>
      </CardFooter>
    </Card>
  )
}
