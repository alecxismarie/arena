import {
  cancelEventAction,
  rescheduleEventAction,
} from "@/app/actions/event-actions";
import { EventSalesMiniChart } from "@/components/charts/dashboard-charts";
import { ChartCard } from "@/components/ui/chart-card";
import { StatusPill } from "@/components/ui/status-pill";
import { getEventById } from "@/lib/analytics";
import { formatCurrency, formatNumber } from "@/lib/utils";
import { format } from "date-fns";
import { Edit3 } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const payload = await getEventById(id);
  if (!payload) {
    notFound();
  }

  const { event, salesTrend, ticketSalesCount } = payload;

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_8px_28px_-22px_rgba(15,23,42,0.8)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {format(event.date, "EEEE, MMMM d, yyyy")}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
              {event.name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {event.description ?? "No event description provided."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Venue: {event.venue?.name ?? "Main Arena"} •{" "}
              {format(event.start_time, "h:mm a")} - {format(event.end_time, "h:mm a")}
            </p>
          </div>

          <div className="space-y-2">
            <StatusPill status={event.status} />
            <Link
              href={`/events/${event.id}/edit`}
              className="inline-flex items-center gap-1 rounded-xl border border-border bg-background px-3 py-2 text-sm font-medium hover:bg-muted"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit event
            </Link>
          </div>
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue Generated</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatCurrency(event.revenue)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Tickets Sold</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(event.tickets_sold)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Attendance</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(event.attendance_count)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Ticket Sale Logs</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(ticketSalesCount)}
          </p>
        </article>
      </section>

      <ChartCard
        title="Event Sales Overview"
        subtitle="Ticket and revenue progression over sale timeline"
      >
        <EventSalesMiniChart data={salesTrend} />
      </ChartCard>

      <section className="grid gap-4 rounded-3xl border border-border/60 bg-card/90 p-5 md:grid-cols-2">
        <form action={rescheduleEventAction} className="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-4">
          <h2 className="text-base font-semibold text-foreground">Reschedule Event</h2>
          <p className="text-sm text-muted-foreground">Choose a new date and keep current time range.</p>
          <input type="hidden" name="event_id" value={event.id} />
          <input
            type="date"
            name="new_date"
            defaultValue={format(event.date, "yyyy-MM-dd")}
            className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm"
            required
          />
          <button
            type="submit"
            className="rounded-xl border border-border bg-card px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            Reschedule
          </button>
        </form>

        <form action={cancelEventAction} className="space-y-2 rounded-2xl border border-rose-200/80 bg-rose-50/70 p-4">
          <h2 className="text-base font-semibold text-rose-700">Cancel Event</h2>
          <p className="text-sm text-rose-700/80">
            Mark this event as cancelled. It remains visible in analytics history.
          </p>
          <input type="hidden" name="event_id" value={event.id} />
          <button
            type="submit"
            className="rounded-xl border border-rose-300 bg-rose-100 px-3 py-2 text-sm font-medium text-rose-700 hover:bg-rose-200"
          >
            Cancel event
          </button>
        </form>
      </section>
    </div>
  );
}
