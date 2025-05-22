"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EventReminderForm } from "@/components/event-reminder-form"
import { CalendarIcon, Clock, MapPin, Users } from "lucide-react"
import { format } from "date-fns"

interface EventDetailsProps {
  eventId: Id<"calendarEvents">
}

export function EventDetails({ eventId }: EventDetailsProps) {
  const event = useQuery(api.calendarEvents.getEventById, { eventId })

  if (!event) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{event.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarIcon className="h-4 w-4" />
            <span>
              {format(new Date(event.startTime), "EEEE, MMMM d, yyyy")}
              {event.startTime !== event.endTime && ` - ${format(new Date(event.endTime), "EEEE, MMMM d, yyyy")}`}
            </span>
          </div>

          <div className="flex items-center gap-2 text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              {format(new Date(event.startTime), "h:mm a")} - {format(new Date(event.endTime), "h:mm a")}
            </span>
          </div>

          {event.location && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>{event.location}</span>
            </div>
          )}

          {event.attendees && event.attendees.length > 0 && (
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <div className="flex flex-wrap gap-1">
                {event.attendees.map((attendee, index) => (
                  <Badge key={index} variant="outline">
                    {attendee}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {event.description && (
            <div className="mt-4 pt-4 border-t">
              <p className="whitespace-pre-wrap">{event.description}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <EventReminderForm eventId={eventId} />
    </div>
  )
}
