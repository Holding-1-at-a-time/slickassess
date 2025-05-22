"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@clerk/nextjs"
import { withAuth } from "../../components/with-auth"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { CalendarIcon, RefreshCw, Link2 } from "lucide-react"
import { toast } from "sonner"

interface Integration {
  _id: string
  accessToken: string
  refreshToken: string
  tokenExpiry: number
  calendarId: string
  syncEnabled: boolean
  lastSynced: number | null
  provider: string
}

function CalendarSyncPage() {
  const [integration, setIntegration] = useState<Integration | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const { userId, getToken } = useAuth()
  const router = useRouter()

  useEffect(() => {
    fetchCalendarStatus()
  }, [])

  async function fetchCalendarStatus() {
    setLoading(true)
    try {
      const token = await getToken({ template: "convex" })
      const res = await fetch("/api/calendar/status", {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const data = await res.json()
        setIntegration(data.integration)
      }
    } catch (error) {
      console.error("Error fetching calendar status:", error)
      toast.error("Failed to fetch calendar status")
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect() {
    window.location.href = "/api/calendar/connect"
  }

  async function handleSyncNow() {
    setSyncing(true)
    try {
      const token = await getToken({ template: "convex" })
      const res = await fetch("/api/calendar/sync", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })

      if (res.ok) {
        const data = await res.json()
        toast.success(`Calendar synced successfully. ${data.eventCount} events imported.`)
        fetchCalendarStatus()
      } else {
        const error = await res.json()
        toast.error(error.error || "Failed to sync calendar")
      }
    } catch (error) {
      console.error("Error syncing calendar:", error)
      toast.error("Failed to sync calendar")
    } finally {
      setSyncing(false)
    }
  }

  async function handleToggleSync(enabled: boolean) {
    if (!integration) return

    try {
      const token = await getToken({ template: "convex" })
      const res = await fetch(`/api/calendar/toggle-sync`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          integrationId: integration._id,
          enabled,
        }),
      })

      if (res.ok) {
        setIntegration((prev) => (prev ? { ...prev, syncEnabled: enabled } : null))
        toast.success(`Calendar sync ${enabled ? "enabled" : "disabled"}`)
      } else {
        toast.error("Failed to update sync settings")
      }
    } catch (error) {
      console.error("Error updating sync settings:", error)
      toast.error("Failed to update sync settings")
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Calendar Integration</h1>
      <p className="text-muted-foreground">Connect your Google Calendar to sync assessment appointments and events.</p>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarIcon className="h-5 w-5" />
            Google Calendar Integration
          </CardTitle>
          <CardDescription>Sync your assessment appointments with Google Calendar</CardDescription>
        </CardHeader>

        <CardContent>
          {integration ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium">Provider</p>
                  <p className="text-sm text-muted-foreground">Google Calendar</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Calendar ID</p>
                  <p className="text-sm text-muted-foreground">{integration.calendarId || "Primary"}</p>
                </div>
                <div>
                  <p className="text-sm font-medium">Last Synced</p>
                  <p className="text-sm text-muted-foreground">
                    {integration.lastSynced ? new Date(integration.lastSynced).toLocaleString() : "Never"}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium">Token Expiry</p>
                  <p className="text-sm text-muted-foreground">{new Date(integration.tokenExpiry).toLocaleString()}</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch id="sync-enabled" checked={integration.syncEnabled} onCheckedChange={handleToggleSync} />
                <Label htmlFor="sync-enabled">Enable automatic sync</Label>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <p className="mb-4">No calendar connected.</p>
              <p className="text-sm text-muted-foreground mb-6">
                Connect your Google Calendar to sync assessment appointments and events.
              </p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex justify-end space-x-2">
          {integration ? (
            <>
              <Button variant="outline" onClick={handleConnect} className="flex items-center gap-2">
                <Link2 className="h-4 w-4" />
                Reconnect
              </Button>
              <Button onClick={handleSyncNow} disabled={syncing} className="flex items-center gap-2">
                <RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />
                {syncing ? "Syncing..." : "Sync Now"}
              </Button>
            </>
          ) : (
            <Button onClick={handleConnect} className="flex items-center gap-2">
              <Link2 className="h-4 w-4" />
              Connect Google Calendar
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}

export default withAuth(CalendarSyncPage, ["admin", "staff", "assessor"])
