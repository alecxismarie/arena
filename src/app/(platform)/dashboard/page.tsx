import {
  AttendanceByEventChart,
  RevenueTrendChart,
  SalesTrendChart,
  TicketDistributionChart,
} from "@/components/charts/dashboard-charts";
import { ChartCard } from "@/components/ui/chart-card";
import { StatCard } from "@/components/ui/stat-card";
import { toTrend } from "@/lib/analytics/metrics";
import { getDashboardData } from "@/lib/analytics";
import { getAuthContext } from "@/lib/auth";
import {
  selectRanking,
  selectRatioValue,
  selectTotalValue,
  selectTrendPoints,
} from "@/lib/domains/metrics-selectors";
import { prisma } from "@/lib/prisma";
import { formatNumber } from "@/lib/utils";
import { getWorkspaceById } from "@/lib/workspace";
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

  const [
    data,
    workspace,
    account,
    inventoryProductCount,
    inventoryReportCount,
    inventoryOpenReportCount,
    assetRecordCount,
  ] = await Promise.all([
    getDashboardData(),
    getWorkspaceById(context.workspaceId),
    prisma.user.findUnique({
      where: { id: context.userId },
      select: {
        name: true,
      },
    }),
    prisma.product.count({
      where: { workspace_id: context.workspaceId },
    }),
    prisma.dailyProductReport.count({
      where: { workspace_id: context.workspaceId },
    }),
    prisma.dailyProductReport.count({
      where: {
        workspace_id: context.workspaceId,
        is_finalized: false,
      },
    }),
    prisma.assetRecord.count({
      where: { workspace_id: context.workspaceId },
    }),
  ]);
  const roleLabel = context.role === "owner" ? "Owner" : "Editor";
  const canViewFinancial = context.role === "owner";
  const accountLabel = account?.name?.trim() || "User";
  const workspaceLabel = workspace?.name ?? "No workspace";
  const eventDomainMetrics = data.domainMetrics;
  const legacyStatsByKey = new Map(data.stats.map((stat) => [stat.key, stat]));
  const eventStats = [
    {
      key: "events" as const,
      label: "Total Events",
      value: selectTotalValue(
        eventDomainMetrics,
        "total_events",
        legacyStatsByKey.get("events")?.value ?? 0,
      ),
      change: selectRatioValue(
        eventDomainMetrics,
        "week_over_week_events_change",
        legacyStatsByKey.get("events")?.change ?? 0,
      ),
    },
    {
      key: "tickets" as const,
      label: "Tickets Sold",
      value: selectTotalValue(
        eventDomainMetrics,
        "tickets_sold",
        legacyStatsByKey.get("tickets")?.value ?? 0,
      ),
      change: selectRatioValue(
        eventDomainMetrics,
        "week_over_week_tickets_change",
        legacyStatsByKey.get("tickets")?.change ?? 0,
      ),
    },
    {
      key: "attendance" as const,
      label: "Actual Attendance",
      value: selectTotalValue(
        eventDomainMetrics,
        "actual_attendance",
        legacyStatsByKey.get("attendance")?.value ?? 0,
      ),
      change: selectRatioValue(
        eventDomainMetrics,
        "week_over_week_attendance_change",
        legacyStatsByKey.get("attendance")?.change ?? 0,
      ),
    },
    {
      key: "revenue" as const,
      label: "Revenue",
      value: selectTotalValue(
        eventDomainMetrics,
        "revenue",
        legacyStatsByKey.get("revenue")?.value ?? 0,
      ),
      change: selectRatioValue(
        eventDomainMetrics,
        "week_over_week_revenue_change",
        legacyStatsByKey.get("revenue")?.change ?? 0,
      ),
    },
  ].map((stat) => ({
    ...stat,
    trend: toTrend(stat.change),
  }));
  const totalEvents = eventStats.find((stat) => stat.key === "events")?.value ?? 0;
  const attendanceExpected = selectTotalValue(
    eventDomainMetrics,
    "expected_attendance",
    data.attendanceComparison.expected,
  );
  const attendanceActual = selectTotalValue(
    eventDomainMetrics,
    "actual_attendance",
    data.attendanceComparison.actual,
  );
  const attendanceRate = selectRatioValue(
    eventDomainMetrics,
    "attendance_rate",
    data.attendanceComparison.rate,
  );
  const attendanceVariance = attendanceActual - attendanceExpected;
  const weeklyRevenueTrend = selectTrendPoints(
    eventDomainMetrics,
    "weekly_revenue",
  );
  const dashboardWeeklyRevenueTrend =
    weeklyRevenueTrend.length > 0
      ? weeklyRevenueTrend.map((point) => ({
          label: point.label,
          revenue: point.value,
        }))
      : data.weeklyRevenueTrend;
  const monthlyRevenueTrend = selectTrendPoints(
    eventDomainMetrics,
    "monthly_revenue",
  );
  const dashboardMonthlyRevenueTrend =
    monthlyRevenueTrend.length > 0
      ? monthlyRevenueTrend.map((point) => ({
          label: point.label,
          revenue: point.value,
        }))
      : data.monthlyRevenueTrend;
  const dailyTicketsTrend = selectTrendPoints(eventDomainMetrics, "daily_tickets");
  const dashboardSalesTrend =
    dailyTicketsTrend.length > 0
      ? dailyTicketsTrend.map((point) => ({
          label: point.label,
          tickets: point.value,
        }))
      : data.salesTrend;
  const attendanceRanking = selectRanking(
    eventDomainMetrics,
    "attendance_by_event",
  );
  const dashboardAttendanceByEvent =
    attendanceRanking.length > 0
      ? attendanceRanking.map((row) => ({
          id: row.id,
          name: row.label,
          attendance: row.value,
        }))
      : data.attendanceByEvent.map((row) => ({
          id: row.id,
          name: row.name,
          attendance: row.attendance,
        }));
  const ticketDistributionRanking = selectRanking(
    eventDomainMetrics,
    "ticket_distribution",
  );
  const dashboardTicketDistribution =
    ticketDistributionRanking.length > 0
      ? ticketDistributionRanking.map((row) => ({
          id: row.id,
          name: row.label,
          tickets: row.value,
        }))
      : data.ticketDistribution;
  const domainCards = [
    {
      key: "events",
      title: "Events",
      count: totalEvents,
      description: "Track attendance, tickets sold, and deterministic event outcomes.",
      href: "/events",
      ctaHref: totalEvents > 0 ? "/events" : "/events/new",
      ctaLabel: totalEvents > 0 ? "Open events" : "Create event",
    },
    {
      key: "inventory",
      title: "Inventory",
      count: inventoryReportCount,
      description: "Monitor daily sales, computed revenue, and gross profit by product.",
      href: "/inventory",
      ctaHref:
        inventoryProductCount > 0
          ? inventoryReportCount > 0
            ? "/inventory"
            : "/inventory/reports/new"
          : "/inventory/products/new",
      ctaLabel:
        inventoryProductCount > 0
          ? inventoryReportCount > 0
            ? "Open inventory"
            : "Add daily report"
          : "Add product",
    },
    {
      key: "assets",
      title: "Assets",
      count: assetRecordCount,
      description: "Measure utilization, idle capacity, and deterministic asset productivity.",
      href: "/assets",
      ctaHref: assetRecordCount > 0 ? "/assets" : "/assets/new",
      ctaLabel: assetRecordCount > 0 ? "Open assets" : "Add asset record",
    },
  ] as const;
  const domainStatuses = [
    {
      key: "events",
      label: "Events",
      status: totalEvents > 0 ? "Active" : "Not started",
      isPositive: totalEvents > 0,
      detail: `${formatNumber(totalEvents)} event record${totalEvents === 1 ? "" : "s"}`,
    },
    {
      key: "inventory",
      label: "Inventory",
      status:
        inventoryProductCount === 0
          ? "Not started"
          : inventoryReportCount > 0
            ? "Active"
            : "Setup only",
      isPositive: inventoryProductCount > 0 && inventoryReportCount > 0,
      detail: `${formatNumber(inventoryReportCount)} report${inventoryReportCount === 1 ? "" : "s"} · ${formatNumber(inventoryProductCount)} product${inventoryProductCount === 1 ? "" : "s"}`,
    },
    {
      key: "assets",
      label: "Assets",
      status: assetRecordCount > 0 ? "Active" : "Not started",
      isPositive: assetRecordCount > 0,
      detail: `${formatNumber(assetRecordCount)} asset record${assetRecordCount === 1 ? "" : "s"}`,
    },
  ] as const;
  const attentionItems: string[] = [];

  if (totalEvents === 0) {
    attentionItems.push(
      "No event records yet. Event analytics will appear after your first event.",
    );
  }
  if (inventoryOpenReportCount > 0) {
    attentionItems.push(
      `${formatNumber(inventoryOpenReportCount)} inventory report${inventoryOpenReportCount === 1 ? "" : "s"} still need closing finalization.`,
    );
  }
  if (assetRecordCount === 0) {
    attentionItems.push(
      "No asset records yet. Asset utilization trends are currently unavailable.",
    );
  }
  if (attentionItems.length === 0) {
    attentionItems.push("No critical blockers detected across Events, Inventory, and Assets.");
  }

  return (
    <div className="space-y-7">
      <header className="rounded-[1.85rem] border border-border/70 bg-gradient-to-br from-card via-card to-surface/80 p-6 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.88)]">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Workspace Control Plane
        </p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
          Workspace overview
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Review current domain coverage and monitor event analytics where event data exists.
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          Workspace: <span className="font-semibold text-accent">{workspaceLabel}</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          {accountLabel} - {roleLabel}
        </p>
      </header>

      <section className="rounded-[1.75rem] border border-border/70 bg-gradient-to-b from-card to-card/92 p-5 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.82)]">
        <h2 className="text-base font-semibold text-foreground">Domain overview</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Current record coverage across implemented domains.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-3">
          {domainCards.map((domain) => (
            <article
              key={domain.key}
              className="rounded-2xl border border-border/70 bg-background/80 p-4 shadow-[0_8px_20px_-20px_rgba(15,23,42,0.75)]"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-foreground">{domain.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                    {formatNumber(domain.count)} records
                  </p>
                </div>
                <Link
                  href={domain.href}
                  className="btn-secondary rounded-lg px-2.5 py-1.5 text-xs font-medium"
                >
                  Open
                </Link>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{domain.description}</p>
              <Link
                href={domain.ctaHref}
                className="btn-primary mt-4 inline-flex rounded-xl px-3.5 py-2 text-xs font-semibold"
              >
                {domain.ctaLabel}
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border/70 bg-gradient-to-b from-card to-card/92 p-5 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.82)]">
        <h2 className="text-base font-semibold text-foreground">Operations pulse</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Domain-neutral operational status, attention items, and quick actions.
        </p>
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div className="grid gap-3 sm:grid-cols-3">
            {domainStatuses.map((domain) => (
              <article
                key={domain.key}
                className="rounded-2xl border border-border/70 bg-background/80 p-3"
              >
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{domain.label}</p>
                <p
                  className={`mt-1 text-sm font-semibold ${
                    domain.isPositive ? "text-emerald-700" : "text-amber-700"
                  }`}
                >
                  {domain.status}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">{domain.detail}</p>
              </article>
            ))}
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Needs attention</h3>
            <ul className="mt-2 space-y-2 text-sm text-muted-foreground">
              {attentionItems.map((item) => (
                <li
                  key={item}
                  className="rounded-xl border border-border/70 bg-background/80 px-3 py-2"
                >
                  {item}
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                href="/inventory/reports/new"
                className="btn-primary rounded-xl px-3.5 py-2 text-xs font-semibold"
              >
                Log inventory
              </Link>
              <Link
                href="/assets/new"
                className="btn-secondary rounded-xl px-3.5 py-2 text-xs font-medium"
              >
                Log asset
              </Link>
              <Link
                href="/events/new"
                className="btn-secondary rounded-xl px-3.5 py-2 text-xs font-medium"
              >
                Log event
              </Link>
              <Link
                href="/reports"
                className="btn-secondary rounded-xl px-3.5 py-2 text-xs font-medium"
              >
                Open reports
              </Link>
            </div>
          </div>
        </div>
      </section>

      {totalEvents > 0 ? (
        <>
          <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {eventStats
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

          <section className="rounded-[1.75rem] border border-border/70 bg-gradient-to-b from-card to-card/92 p-5 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.82)]">
            <h2 className="text-base font-semibold text-foreground">
              Event attendance: expected vs actual
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Compare planned turnout with actual attendance across events.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <article className="rounded-2xl border border-border/70 bg-background/80 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Expected</p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {formatNumber(attendanceExpected)}
                </p>
              </article>
              <article className="rounded-2xl border border-border/70 bg-background/80 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Actual</p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {formatNumber(attendanceActual)}
                </p>
              </article>
              <article className="rounded-2xl border border-border/70 bg-background/80 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Variance</p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {formatNumber(attendanceVariance)}
                </p>
              </article>
              <article className="rounded-2xl border border-border/70 bg-background/80 p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  Attendance Rate
                </p>
                <p className="mt-1 text-xl font-semibold text-foreground">
                  {(attendanceRate * 100).toFixed(1)}%
                </p>
              </article>
            </div>
          </section>

          {canViewFinancial ? (
            <section className="grid gap-4 xl:grid-cols-7">
              <ChartCard
                title="Revenue Trend"
                subtitle="Event revenue by week and month"
                className="xl:col-span-4"
              >
                <RevenueTrendChart
                  weekly={dashboardWeeklyRevenueTrend}
                  monthly={dashboardMonthlyRevenueTrend}
                  currency={workspace?.currency}
                />
              </ChartCard>

              <ChartCard
                title="Ticket Distribution"
                subtitle="Tickets sold by event"
                className="xl:col-span-3"
              >
                <TicketDistributionChart data={dashboardTicketDistribution} />
              </ChartCard>
            </section>
          ) : (
            <section>
              <ChartCard
                title="Ticket Distribution"
                subtitle="Tickets sold by event"
              >
                <TicketDistributionChart data={dashboardTicketDistribution} />
              </ChartCard>
            </section>
          )}

          <section className="grid gap-4 xl:grid-cols-7">
            <ChartCard
              title="Attendance by Event"
              subtitle="Events ranked by actual attendance"
              className="xl:col-span-4"
            >
              <AttendanceByEventChart data={dashboardAttendanceByEvent} />
            </ChartCard>

            <ChartCard
              title="Sales Trend"
              subtitle="Tickets sold over the last 30 days"
              className="xl:col-span-3"
            >
              <SalesTrendChart data={dashboardSalesTrend} />
            </ChartCard>
          </section>
        </>
      ) : null}
    </div>
  );
}

