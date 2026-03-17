import { CalendarView } from "@/components/calendar/calendar-view";
import { StatusPill } from "@/components/ui/status-pill";
import {
  cancelEventAction,
  rescheduleEventAction,
} from "@/app/actions/event-actions";
import { getCalendarEvents } from "@/lib/analytics";
import { addDays, format } from "date-fns";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const events = await getCalendarEvents();

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Event Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Monthly and weekly scheduling with live status control.
          </p>
        </div>
        <Link
          href="/events/new"
          className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
        >
          Create event
        </Link>
      </header>

      <CalendarView
        events={events.map((event) => ({
          id: event.id,
          name: event.name,
          date: event.date.toISOString(),
          startTime: format(event.start_time, "h:mm a"),
          status: event.status,
        }))}
      />

      <section className="rounded-3xl border border-border/60 bg-card/90 p-5 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.8)]">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Calendar Actions</h2>
          <p className="text-sm text-muted-foreground">
            Edit, reschedule, or cancel events directly from calendar operations.
          </p>
        </div>

        <div className="space-y-3">
          {events.slice(0, 12).map((event) => (
            <article
              key={event.id}
              className="rounded-2xl border border-border/70 bg-background/80 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{event.name}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {format(event.date, "EEE, MMM d, yyyy")} •{" "}
                    {format(event.start_time, "h:mm a")} - {format(event.end_time, "h:mm a")}
                  </p>
                  <div className="mt-2">
                    <StatusPill status={event.status} />
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/events/${event.id}`}
                    className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted"
                  >
                    Details
                  </Link>
                  <Link
                    href={`/events/${event.id}/edit`}
                    className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted"
                  >
                    Edit
                  </Link>
                  <form action={cancelEventAction}>
                    <input type="hidden" name="event_id" value={event.id} />
                    <button
                      type="submit"
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700 hover:bg-rose-100"
                    >
                      Cancel
                    </button>
                  </form>
                </div>
              </div>

              <form action={rescheduleEventAction} className="mt-3 flex flex-wrap items-center gap-2">
                <input type="hidden" name="event_id" value={event.id} />
                <input
                  name="new_date"
                  type="date"
                  defaultValue={format(addDays(event.date, 1), "yyyy-MM-dd")}
                  className="rounded-xl border border-border bg-background px-3 py-2 text-xs"
                  required
                />
                <button
                  type="submit"
                  className="rounded-xl border border-border bg-card px-3 py-2 text-xs font-medium hover:bg-muted"
                >
                  Reschedule
                </button>
              </form>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
