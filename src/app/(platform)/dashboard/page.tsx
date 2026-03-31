import {
  AttendanceByEventChart,
  RevenueTrendChart,
  SalesTrendChart,
  TicketDistributionChart,
} from "@/components/charts/dashboard-charts";
import { ChartCard } from "@/components/ui/chart-card";
import { StatCard } from "@/components/ui/stat-card";
import { getDashboardData } from "@/lib/analytics";
import { formatNumber } from "@/lib/utils";
import { getCurrentWorkspace } from "@/lib/workspace";
import { CalendarClock, DollarSign, TicketCheck, Users } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

const statIconMap = {
  events: CalendarClock,
  tickets: TicketCheck,
  attendance: Users,
  revenue: DollarSign,
};

export default async function DashboardPage() {
  const [data, workspace] = await Promise.all([
    getDashboardData(),
    getCurrentWorkspace(),
  ]);
  const totalEvents =
    data.stats.find((stat) => stat.key === "events")?.value ?? 0;

  if (totalEvents === 0) {
    return (
      <div className="space-y-6">
        <header className="rounded-3xl border border-border/60 bg-card/85 p-6 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.8)]">
          <p className="text-sm font-medium text-accent">Signals</p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Workspace ready
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Create your first event to start tracking performance.
          </p>
        </header>

        <section className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.75)]">
          <h2 className="text-lg font-semibold text-foreground">
            Get started
          </h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Create an event</li>
            <li>Add expected attendance, tickets sold, and actual attendance</li>
            <li>Review performance and historical guidance</li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/events/new"
              className="rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-accent-foreground transition hover:opacity-90"
            >
              Create event
            </Link>
            <Link
              href="/settings"
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
            >
              Review workspace settings
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border/60 bg-card/85 p-6 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.8)]">
        <p className="text-sm font-medium text-accent">Signals</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
          Event performance
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Monitor event performance and understand attendance across your events.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.stats.map((stat) => (
          <StatCard
            key={stat.key}
            label={stat.label}
            value={stat.value}
            change={stat.change}
            trend={stat.trend}
            icon={statIconMap[stat.key as keyof typeof statIconMap]}
            format={stat.key === "revenue" ? "currency" : "number"}
            currency={workspace?.currency}
          />
        ))}
      </section>

      <section className="rounded-3xl border border-border/60 bg-card/90 p-5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.75)]">
        <h2 className="text-base font-semibold text-foreground">Expected vs Actual Attendance</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Compare planned turnout with actual attendance.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-border/60 bg-background/70 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Expected</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {formatNumber(data.attendanceComparison.expected)}
            </p>
          </article>
          <article className="rounded-2xl border border-border/60 bg-background/70 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Actual</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {formatNumber(data.attendanceComparison.actual)}
            </p>
          </article>
          <article className="rounded-2xl border border-border/60 bg-background/70 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Variance</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {formatNumber(data.attendanceComparison.variance)}
            </p>
          </article>
          <article className="rounded-2xl border border-border/60 bg-background/70 p-3">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Attendance Rate</p>
            <p className="mt-1 text-xl font-semibold text-foreground">
              {(data.attendanceComparison.rate * 100).toFixed(1)}%
            </p>
          </article>
        </div>
      </section>

      <section className="grid gap-4 xl:grid-cols-7">
        <ChartCard
          title="Revenue Trend"
          subtitle="Revenue by week and month"
          className="xl:col-span-4"
        >
          <RevenueTrendChart
            weekly={data.weeklyRevenueTrend}
            monthly={data.monthlyRevenueTrend}
            currency={workspace?.currency}
          />
        </ChartCard>

        <ChartCard
          title="Ticket Distribution"
          subtitle="Tickets sold by event"
          className="xl:col-span-3"
        >
          <TicketDistributionChart data={data.ticketDistribution} />
        </ChartCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-7">
        <ChartCard
          title="Attendance by Event"
          subtitle="Events ranked by actual attendance"
          className="xl:col-span-4"
        >
          <AttendanceByEventChart data={data.attendanceByEvent} />
        </ChartCard>

        <ChartCard
          title="Sales Trend"
          subtitle="Tickets sold over the last 30 days"
          className="xl:col-span-3"
        >
          <SalesTrendChart data={data.salesTrend} />
        </ChartCard>
      </section>
    </div>
  );
}
