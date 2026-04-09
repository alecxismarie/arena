import {
  cancelEventAction,
  rescheduleEventAction,
} from "@/app/actions/event-actions";
import { EventSalesMiniChart } from "@/components/charts/dashboard-charts";
import { SalesTrendChart } from "@/components/charts/dashboard-charts";
import { ChartCard } from "@/components/ui/chart-card";
import { StatusPill } from "@/components/ui/status-pill";
import { getEventById } from "@/lib/analytics";
import { getAuthContext } from "@/lib/auth";
import { formatCurrency, formatInTimezone, formatNumber } from "@/lib/utils";
import { getWorkspaceById } from "@/lib/workspace";
import { format } from "date-fns";
import { Edit3 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function EventDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const context = await getAuthContext();
  if (!context) {
    redirect("/");
  }
  const canViewFinancial = context.role === "owner";

  const { id } = await params;
  const [payload, workspace] = await Promise.all([
    getEventById(id),
    getWorkspaceById(context.workspaceId),
  ]);
  if (!payload) {
    notFound();
  }

  const { event, salesTrend, attendanceComparison, intelligence } = payload;

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_8px_28px_-22px_rgba(15,23,42,0.8)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm text-muted-foreground">
              {formatInTimezone(event.date, workspace?.timezone, {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
              {event.name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {event.description ?? "View how this event performed."}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              Venue: {event.venue?.name ?? "No venue selected"} -{" "}
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
          </div>

          <div className="space-y-2">
            <StatusPill status={event.status} />
            <Link
              href={`/events/${event.id}/edit`}
              className="btn-secondary inline-flex items-center gap-1 rounded-xl px-3 py-2 text-sm font-medium"
            >
              <Edit3 className="h-3.5 w-3.5" />
              Edit event
            </Link>
          </div>
        </div>
      </header>

      <section className={`grid gap-4 md:grid-cols-2 ${canViewFinancial ? "xl:grid-cols-3" : "xl:grid-cols-2"}`}>
        {canViewFinancial ? (
          <article className="rounded-2xl border border-border/60 bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {formatCurrency(event.revenue, workspace?.currency)}
            </p>
          </article>
        ) : null}
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Tickets Sold</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(event.tickets_sold)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Expected Attendance</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(event.expected_attendees)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Actual Attendance</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(event.actual_attendees)}
          </p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Attendance Variance</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(attendanceComparison.variance)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Actual attendance minus expected attendance</p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Attendance Rate</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {(attendanceComparison.rate * 100).toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Actual attendance divided by expected attendance</p>
        </article>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card/90 p-5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.75)]">
        <header>
          <h2 className="text-lg font-semibold text-foreground">Event Intelligence</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Historical guidance from comparable completed events.
          </p>
        </header>

        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">{intelligence.message}</p>

          {intelligence.insufficientData ? (
            <p className="rounded-xl border border-border/60 bg-background/70 px-3 py-2 text-sm text-muted-foreground">
              More completed events are needed before meaningful comparisons can be shown.
            </p>
          ) : (
            <>
              {intelligence.averages ? (
                <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  <article className="rounded-2xl border border-border/60 bg-background/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Average Attendance Rate</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {(intelligence.averages.attendance_rate * 100).toFixed(1)}%
                    </p>
                  </article>
                  <article className="rounded-2xl border border-border/60 bg-background/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Average Expected Attendance</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {formatNumber(Math.round(intelligence.averages.expected_attendees))}
                    </p>
                  </article>
                  <article className="rounded-2xl border border-border/60 bg-background/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Average Actual Attendance</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {formatNumber(Math.round(intelligence.averages.actual_attendees))}
                    </p>
                  </article>
                  <article className="rounded-2xl border border-border/60 bg-background/70 p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Average Tickets Sold</p>
                    <p className="mt-1 text-lg font-semibold text-foreground">
                      {formatNumber(Math.round(intelligence.averages.tickets_sold))}
                    </p>
                  </article>
                </section>
              ) : null}

              {intelligence.turnoutRange ? (
                <article className="rounded-2xl border border-border/60 bg-background/70 p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">Typical Attendance Range</p>
                  <p className="mt-1 text-lg font-semibold text-foreground">
                    {formatNumber(intelligence.turnoutRange.min)} to{" "}
                    {formatNumber(intelligence.turnoutRange.max)}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {intelligence.turnoutRange.label}
                  </p>
                </article>
              ) : null}

              {intelligence.expectedComparison ? (
                <p className="text-sm text-muted-foreground">
                  This event&apos;s expected attendance is{" "}
                  {intelligence.expectedComparison.position === "aligned"
                    ? "aligned with"
                    : intelligence.expectedComparison.position === "above"
                      ? "above"
                      : "below"}{" "}
                  the comparable-event average
                  {intelligence.expectedComparison.position === "aligned"
                    ? "."
                    : ` by ${formatNumber(Math.round(Math.abs(intelligence.expectedComparison.deltaFromAverage)))} compared with the average.`}
                </p>
              ) : null}

              <section>
                <h3 className="text-sm font-semibold text-foreground">
                  Expected vs actual attendance trend
                </h3>
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full border-separate border-spacing-y-1.5 text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                        <th className="px-2 py-1.5">Date</th>
                        <th className="px-2 py-1.5">Expected</th>
                        <th className="px-2 py-1.5">Actual</th>
                        <th className="px-2 py-1.5">Tickets</th>
                        <th className="px-2 py-1.5">Attendance Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {intelligence.trend.map((row) => (
                        <tr key={row.id} className="rounded-xl bg-muted/35 text-foreground">
                          <td className="rounded-l-xl px-2 py-2">
                            {formatInTimezone(row.date, workspace?.timezone, {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-2 py-2">{formatNumber(row.expected_attendees)}</td>
                          <td className="px-2 py-2">{formatNumber(row.actual_attendees)}</td>
                          <td className="px-2 py-2">{formatNumber(row.tickets_sold)}</td>
                          <td className="rounded-r-xl px-2 py-2">
                            {(row.attendance_rate * 100).toFixed(1)}%
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
        </div>
      </section>

      {canViewFinancial ? (
        <ChartCard
          title="Event Performance"
          subtitle="Current tickets sold and revenue"
        >
          <EventSalesMiniChart data={salesTrend} currency={workspace?.currency} />
        </ChartCard>
      ) : (
        <ChartCard
          title="Event Performance"
          subtitle="Current tickets sold trend"
        >
          <SalesTrendChart
            data={salesTrend.map((point) => ({
              label: point.label,
              tickets: point.tickets,
            }))}
          />
        </ChartCard>
      )}

      <section className="grid gap-4 rounded-3xl border border-border/60 bg-card/90 p-5 md:grid-cols-2">
        <form action={rescheduleEventAction} className="space-y-2 rounded-2xl border border-border/60 bg-background/70 p-4">
          <h2 className="text-base font-semibold text-foreground">Reschedule Event</h2>
          <p className="text-sm text-muted-foreground">Choose a new date and keep the same time.</p>
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
            className="btn-secondary rounded-xl px-3 py-2 text-sm font-medium"
          >
            Reschedule
          </button>
        </form>

        <form action={cancelEventAction} className="space-y-2 rounded-2xl border border-border/70 bg-surface/90 p-4">
          <h2 className="text-base font-semibold text-foreground">Cancel Event</h2>
          <p className="text-sm text-muted-foreground">
            Mark this event as cancelled. It stays in historical reporting.
          </p>
          <input type="hidden" name="event_id" value={event.id} />
          <button
            type="submit"
            className="btn-secondary rounded-xl px-3 py-2 text-sm font-medium"
          >
            Cancel event
          </button>
        </form>
      </section>
    </div>
  );
}

