"use client"

import { withAuth } from "@/components/with-auth"
import { UserReminderPreferences } from "@/components/user-reminder-preferences"

function ReminderPreferencesPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Reminder Preferences</h1>
      <p className="text-muted-foreground">
        Configure your default reminder settings for calendar events and assessments.
      </p>

      <UserReminderPreferences />
    </div>
  )
}

export default withAuth(ReminderPreferencesPage, ["admin", "staff", "assessor"])
