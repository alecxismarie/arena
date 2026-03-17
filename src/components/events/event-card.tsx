import { EventRecord } from "@/lib/analytics";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarClock, Users } from "lucide-react";
import Link from "next/link";
import { StatusPill } from "@/components/ui/status-pill";

export function EventCard({ event }: { event: EventRecord }) {
  return (
    <article className="rounded-3xl border border-border/60 bg-card p-5 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.7)] transition-all hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-22px_rgba(15,23,42,0.65)]">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-foreground">{event.name}</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {event.venue?.name ?? "Main Arena"} • {format(event.date, "EEE, MMM d")}
          </p>
        </div>
        <StatusPill status={event.status} />
      </div>

      <div className="grid gap-3 text-sm sm:grid-cols-2">
        <p className="flex items-center gap-2 text-muted-foreground">
          <CalendarClock className="h-4 w-4 text-accent" />
          {format(event.start_time, "h:mm a")} - {format(event.end_time, "h:mm a")}
        </p>
        <p className="flex items-center gap-2 text-muted-foreground">
          <Users className="h-4 w-4 text-accent" />
          {formatNumber(event.attendance_count)} attendees
        </p>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 rounded-2xl border border-border/70 bg-muted/40 p-3 text-sm">
        <div>
          <p className="text-xs text-muted-foreground">Tickets</p>
          <p className="mt-1 font-semibold text-foreground">{formatNumber(event.tickets_sold)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Capacity</p>
          <p className="mt-1 font-semibold text-foreground">{formatNumber(event.capacity)}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Revenue</p>
          <p className="mt-1 font-semibold text-foreground">{formatCurrency(event.revenue)}</p>
        </div>
      </div>

      <Link
        href={`/events/${event.id}`}
        className="mt-4 inline-flex rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium text-foreground transition-colors hover:bg-muted/70"
      >
        View details
      </Link>
    </article>
  );
}
