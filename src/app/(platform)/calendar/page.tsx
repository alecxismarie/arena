import {
  cancelEventAction,
  rescheduleEventAction,
} from "@/app/actions/event-actions";
import { CalendarView } from "@/components/calendar/calendar-view";
import { StatusPill } from "@/components/ui/status-pill";
import { getCalendarEvents } from "@/lib/analytics";
import { formatDateKeyInTimezone, formatInTimezone } from "@/lib/utils";
import { getCurrentWorkspace } from "@/lib/workspace";
import { addDays, format } from "date-fns";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const [events, workspace] = await Promise.all([
    getCalendarEvents(),
    getCurrentWorkspace(),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Plan event schedules and keep status up to date.
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
          dayKey: formatDateKeyInTimezone(event.date, workspace?.timezone),
          startTime: formatInTimezone(event.start_time, workspace?.timezone, {
            hour: "numeric",
            minute: "2-digit",
          }),
          status: event.status,
        }))}
        timezone={workspace?.timezone}
      />

      <section className="rounded-3xl border border-border/60 bg-card/90 p-5 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.8)]">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-foreground">Calendar Actions</h2>
          <p className="text-sm text-muted-foreground">
            Edit, reschedule, or cancel events from one view.
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
                    {formatInTimezone(event.date, workspace?.timezone, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}{" "}
                    -{" "}
                    {formatInTimezone(event.start_time, workspace?.timezone, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}{" "}
                    to{" "}
                    {formatInTimezone(event.end_time, workspace?.timezone, {
                      hour: "numeric",
                      minute: "2-digit",
                    })}
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
