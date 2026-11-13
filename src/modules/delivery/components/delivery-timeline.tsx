import { format } from "date-fns"

import { StatusBadge } from "@/components/ui/status-badge"

/**
 * Structural subset of DeliveryEvent (@/types/db) — loose enough that the public
 * /track/[code] page can also feed it straight from get_tracking()'s jsonb
 * `events` array (which carries no id/org_id/delivery_id/actor_id/location).
 */
export interface TimelineEvent {
  id: string | number
  status: string | null
  note: string | null
  created_at: string
}

/** Chronological events list — used by both the admin delivery detail page and /track/[code]. */
function DeliveryTimeline({ events }: { events: TimelineEvent[] }) {
  if (events.length === 0) {
    return <p className="text-muted-foreground text-sm">아직 기록이 없습니다.</p>
  }

  return (
    <ol className="flex flex-col gap-4">
      {events.map((event) => (
        <li key={event.id} className="flex items-start gap-3">
          <div className="bg-muted-foreground/40 mt-1.5 size-1.5 shrink-0 rounded-full" />
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-2">
              {event.status ? <StatusBadge kind="delivery" value={event.status} /> : null}
              <span className="text-muted-foreground text-xs">
                {format(new Date(event.created_at), "d MMM, h:mm a")}
              </span>
            </div>
            {event.note ? <p className="text-foreground text-sm">{event.note}</p> : null}
          </div>
        </li>
      ))}
    </ol>
  )
}

export { DeliveryTimeline }
