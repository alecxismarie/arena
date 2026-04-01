import {
  ReportBarChart,
  RevenueTrendChart,
  SalesTrendChart,
} from "@/components/charts/dashboard-charts";
import { ReportTable } from "@/components/reports/report-table";
import { ChartCard } from "@/components/ui/chart-card";
import { getReportsData } from "@/lib/analytics";
import { getAuthContext } from "@/lib/auth";
import { formatNumber } from "@/lib/utils";
import { getCurrentWorkspace } from "@/lib/workspace";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/");
  }
  const canViewFinancial = context.role === "owner";

  const [report, workspace] = await Promise.all([
    getReportsData(),
    getCurrentWorkspace(),
  ]);

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.8)]">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Review performance trends and expected vs actual attendance.
        </p>
        {canViewFinancial ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/api/reports/export?report=event_summary"
              className="btn-secondary rounded-xl px-3 py-2 text-xs font-medium"
            >
              Export Event Summary CSV
            </Link>
            <Link
              href="/api/reports/export?report=attendance"
              className="btn-secondary rounded-xl px-3 py-2 text-xs font-medium"
            >
              Export Attendance CSV
            </Link>
            <Link
              href="/api/reports/export?report=revenue"
              className="btn-secondary rounded-xl px-3 py-2 text-xs font-medium"
            >
              Export Revenue CSV
            </Link>
            <Link
              href="/api/reports/export?report=weekly_sales"
              className="btn-secondary rounded-xl px-3 py-2 text-xs font-medium"
            >
              Export Weekly Sales CSV
            </Link>
            <Link
              href="/api/reports/export?report=monthly_sales"
              className="btn-secondary rounded-xl px-3 py-2 text-xs font-medium"
            >
              Export Monthly Sales CSV
            </Link>
          </div>
        ) : null}
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {report.metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-2xl border border-border/60 bg-card p-4 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.75)]"
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">{formatNumber(metric.value)}</p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-7">
        <ChartCard
          title="Weekly Sales Report"
          subtitle="Tickets sold over the last 8 weeks"
          className={canViewFinancial ? "xl:col-span-4" : "xl:col-span-7"}
        >
          <SalesTrendChart
            data={report.weeklySales.map((row) => ({
              label: row.label,
              tickets: row.tickets,
            }))}
          />
        </ChartCard>
        {canViewFinancial ? (
          <ChartCard
            title="Monthly Sales Report"
            subtitle="Revenue over the last 6 months"
            className="xl:col-span-3"
          >
            <RevenueTrendChart
              weekly={report.weeklySales.map((row) => ({
                label: row.label,
                revenue: row.revenue,
              }))}
              monthly={report.monthlySales.map((row) => ({
                label: row.label,
                revenue: row.revenue,
              }))}
              currency={workspace?.currency}
            />
          </ChartCard>
        ) : null}
      </section>

      <section className={`grid gap-4 ${canViewFinancial ? "xl:grid-cols-2" : "xl:grid-cols-1"}`}>
        <ChartCard title="Attendance Report" subtitle="Top events by actual attendance">
          <ReportBarChart
            data={report.attendanceReport.map((row) => ({
              name: row.name,
              attendance: row.attendance,
            }))}
            valueKey="attendance"
            color="#cf8312"
          />
        </ChartCard>
        {canViewFinancial ? (
          <ChartCard title="Revenue Report" subtitle="Top events by revenue">
            <ReportBarChart
              data={report.revenueReport.map((row) => ({
                name: row.name,
                revenue: row.revenue,
              }))}
              valueKey="revenue"
              color="#7f6653"
              formatMode="currency"
              currency={workspace?.currency}
            />
          </ChartCard>
        ) : null}
      </section>

      <ReportTable
        rows={report.eventSummaryRows.map((row) =>
          canViewFinancial
            ? {
                ...row,
                date: row.date.toISOString(),
              }
            : {
                id: row.id,
                name: row.name,
                date: row.date.toISOString(),
                status: row.status,
                expected_attendees: row.expected_attendees,
                tickets_sold: row.tickets_sold,
                actual_attendees: row.actual_attendees,
                attendance_variance: row.attendance_variance,
                attendance_rate: row.attendance_rate,
              },
        )}
        showRevenue={canViewFinancial}
        timezone={workspace?.timezone}
        currency={workspace?.currency}
      />
    </div>
  );
}
