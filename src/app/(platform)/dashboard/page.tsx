import {
  AttendanceByEventChart,
  RevenueTrendChart,
  SalesTrendChart,
  TicketDistributionChart,
} from "@/components/charts/dashboard-charts";
import { ChartCard } from "@/components/ui/chart-card";
import { StatCard } from "@/components/ui/stat-card";
import { getDashboardData } from "@/lib/analytics";
import { getAuthContext } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { formatNumber } from "@/lib/utils";
import { getCurrentWorkspace } from "@/lib/workspace";
import { CalendarClock, DollarSign, TicketCheck, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

const statIconMap = {
  events: CalendarClock,
  tickets: TicketCheck,
  attendance: Users,
  revenue: DollarSign,
};

export default async function DashboardPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/");
  }

  const [data, workspace, account] = await Promise.all([
    getDashboardData(),
    getCurrentWorkspace(),
    prisma.user.findUnique({
      where: { id: context.userId },
      select: {
        name: true,
      },
    }),
  ]);
  const roleLabel = context.role === "owner" ? "Owner" : "Editor";
  const canViewFinancial = context.role === "owner";
  const accountLabel = account?.name?.trim() || "User";
  const workspaceLabel = workspace?.name ?? "No workspace";
  const totalEvents =
    data.stats.find((stat) => stat.key === "events")?.value ?? 0;

  if (totalEvents === 0) {
    return (
      <div className="space-y-6">
        <header className="rounded-3xl border border-border/60 bg-card/85 p-6 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.8)]">
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Workspace ready
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Create your first event to start tracking performance.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Workspace: <span className="font-semibold text-accent">{workspaceLabel}</span>
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {accountLabel} - {roleLabel}
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
              className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              Create event
            </Link>
            <Link
              href="/settings"
              className="btn-secondary rounded-xl px-4 py-2.5 text-sm font-medium"
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
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
          See how your events performed
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Monitor event performance and understand attendance across your events.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Workspace: <span className="font-semibold text-accent">{workspaceLabel}</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {accountLabel} - {roleLabel}
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {data.stats
          .filter((stat) => canViewFinancial || stat.key !== "revenue")
          .map((stat) => (
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

      {canViewFinancial ? (
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
      ) : (
        <section>
          <ChartCard
            title="Ticket Distribution"
            subtitle="Tickets sold by event"
          >
            <TicketDistributionChart data={data.ticketDistribution} />
          </ChartCard>
        </section>
      )}

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
