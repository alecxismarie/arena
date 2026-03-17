import {
  ReportBarChart,
  RevenueTrendChart,
  SalesTrendChart,
} from "@/components/charts/dashboard-charts";
import { ReportTable } from "@/components/reports/report-table";
import { ChartCard } from "@/components/ui/chart-card";
import { getReportsData } from "@/lib/analytics";
import { formatCurrency, formatNumber } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const report = await getReportsData();

  return (
    <div className="space-y-6">
      <header className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_10px_28px_-22px_rgba(15,23,42,0.8)]">
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Weekly and monthly sales intelligence with attendance and revenue analysis.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {report.metrics.map((metric) => (
          <article
            key={metric.label}
            className="rounded-2xl border border-border/60 bg-card p-4 shadow-[0_8px_20px_-18px_rgba(15,23,42,0.75)]"
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{metric.label}</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {metric.label === "Revenue"
                ? formatCurrency(metric.value)
                : formatNumber(metric.value)}
            </p>
          </article>
        ))}
      </section>

      <section className="grid gap-4 xl:grid-cols-7">
        <ChartCard
          title="Weekly Sales Report"
          subtitle="Ticket sales volume over the last 8 weeks"
          className="xl:col-span-4"
        >
          <SalesTrendChart
            data={report.weeklySales.map((row) => ({
              label: row.label,
              tickets: row.tickets,
            }))}
          />
        </ChartCard>
        <ChartCard
          title="Monthly Sales Report"
          subtitle="Revenue trend over the last 6 months"
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
          />
        </ChartCard>
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Attendance Report" subtitle="Top events by attendance">
          <ReportBarChart
            data={report.attendanceReport.map((row) => ({
              name: row.name,
              attendance: row.attendance,
            }))}
            valueKey="attendance"
            color="#2563eb"
          />
        </ChartCard>
        <ChartCard title="Revenue Report" subtitle="Top events by revenue">
          <ReportBarChart
            data={report.revenueReport.map((row) => ({
              name: row.name,
              revenue: row.revenue,
            }))}
            valueKey="revenue"
            color="#14b8a6"
            formatMode="currency"
          />
        </ChartCard>
      </section>

      <ReportTable
        rows={report.eventSummaryRows.map((row) => ({
          ...row,
          date: row.date.toISOString(),
        }))}
      />
    </div>
  );
}
