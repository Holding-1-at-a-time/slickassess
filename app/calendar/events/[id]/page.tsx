"use client"

import { useParams } from "next/navigation"
import { withAuth } from "@/components/with-auth"
import { EventDetails } from "@/components/event-details"
import type { Id } from "@/convex/_generated/dataModel"

function EventDetailsPage() {
  const params = useParams()
  const eventId = params.id as Id<"calendarEvents">

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Event Details</h1>
      <EventDetails eventId={eventId} />
    </div>
  )
}

export default withAuth(EventDetailsPage, ["admin", "staff", "assessor"])
