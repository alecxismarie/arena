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
import {
  selectInsights,
  selectRatioValue,
  selectTotalValue,
  selectTrendPoints,
} from "@/lib/domains/metrics-selectors";
import { formatCurrency, formatInTimezone, formatNumber } from "@/lib/utils";
import { getWorkspaceById } from "@/lib/workspace";
import { format } from "date-fns";
import { Edit3 } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

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

  const { event, salesTrend, attendanceComparison, intelligence, domainMetrics } = payload;
  const summaryRevenue = selectTotalValue(domainMetrics, "revenue", event.revenue);
  const summaryTicketsSold = selectTotalValue(
    domainMetrics,
    "tickets_sold",
    event.tickets_sold,
  );
  const summaryExpectedAttendance = selectTotalValue(
    domainMetrics,
    "expected_attendance",
    event.expected_attendees,
  );
  const summaryActualAttendance = selectTotalValue(
    domainMetrics,
    "actual_attendance",
    event.actual_attendees,
  );
  const summaryAttendanceRate = selectRatioValue(
    domainMetrics,
    "attendance_rate",
    attendanceComparison.rate,
  );
  const summaryAttendanceVariance =
    summaryActualAttendance - summaryExpectedAttendance;
  const eventSalesTrendPoints = selectTrendPoints(domainMetrics, "daily_tickets");
  const resolvedSalesTrend =
    eventSalesTrendPoints.length > 0
      ? eventSalesTrendPoints.map((point, index) => ({
          label: point.label,
          tickets: point.value,
          revenue:
            typeof point.meta?.revenue === "number"
              ? point.meta.revenue
              : (salesTrend[index]?.revenue ?? 0),
        }))
      : salesTrend;
  const insightItems = selectInsights(domainMetrics);
  const intelligenceMessage = insightItems[0]?.message ?? intelligence.message;

  return (
    <div className="space-y-7">
      <header className="rounded-[1.85rem] border border-border/70 bg-gradient-to-br from-card via-card to-surface/80 p-6 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.88)]">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Event Snapshot
            </p>
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
          <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.74)]">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {formatCurrency(summaryRevenue, workspace?.currency)}
            </p>
          </article>
        ) : null}
        <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.74)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Tickets Sold</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(summaryTicketsSold)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.74)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Expected Attendance</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(summaryExpectedAttendance)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.74)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Actual Attendance</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(summaryActualAttendance)}
          </p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.74)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Attendance Variance</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(summaryAttendanceVariance)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Actual attendance minus expected attendance</p>
        </article>
        <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.74)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Attendance Rate</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {(summaryAttendanceRate * 100).toFixed(1)}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Actual attendance divided by expected attendance</p>
        </article>
      </section>

      <section className="rounded-[1.75rem] border border-border/70 bg-gradient-to-b from-card to-card/92 p-5 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.82)]">
        <header>
          <h2 className="text-lg font-semibold text-foreground">Event Intelligence</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Historical guidance from comparable completed events.
          </p>
        </header>

        <div className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">{intelligenceMessage}</p>

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
                        <tr key={row.id} className="rounded-xl bg-background/80 text-foreground">
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
          <EventSalesMiniChart data={resolvedSalesTrend} currency={workspace?.currency} />
        </ChartCard>
      ) : (
        <ChartCard
          title="Event Performance"
          subtitle="Current tickets sold trend"
        >
          <SalesTrendChart
            data={resolvedSalesTrend.map((point) => ({
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

