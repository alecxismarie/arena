import {
  ReportBarChart,
  RevenueTrendChart,
  SalesTrendChart,
} from "@/components/charts/dashboard-charts";
import { ReportTable } from "@/components/reports/report-table";
import { ChartCard } from "@/components/ui/chart-card";
import { getAssetUtilizationData } from "@/lib/asset";
import { getReportsData } from "@/lib/analytics";
import { getAuthContext } from "@/lib/auth";
import { getDomainUsageSignals } from "@/lib/domain-focus";
import {
  selectInsights,
  selectRanking,
  selectRatioMetric,
  selectTotalValue,
  selectTrendPoints,
} from "@/lib/domains/metrics-selectors";
import { LegacySurfaceDomain } from "@/lib/domains/types";
import { getInventoryPerformanceData } from "@/lib/inventory";
import { formatCurrency, formatInTimezone, formatNumber } from "@/lib/utils";
import { resolveWorkspaceDomainState } from "@/lib/workspace-domain-config";
import { getWorkspaceById } from "@/lib/workspace";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

export const dynamic = "force-dynamic";

type ReportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

type ReportTab = "combined" | "events" | "inventory" | "assets";

const TAB_ITEMS: Array<{ key: ReportTab; label: string }> = [
  { key: "events", label: "Events" },
  { key: "inventory", label: "Inventory" },
  { key: "assets", label: "Assets" },
  { key: "combined", label: "Combined Overview" },
];

function resolveTab(raw: string | string[] | undefined, fallback: ReportTab): ReportTab {
  const normalized = Array.isArray(raw) ? raw[0] : raw;
  if (normalized === "events") return "events";
  if (normalized === "inventory") return "inventory";
  if (normalized === "assets") return "assets";
  if (normalized === "combined") return "combined";
  return fallback;
}

function tabHref(tab: ReportTab, defaultTab: ReportTab) {
  return tab === defaultTab ? "/reports" : `/reports?tab=${tab}`;
}

function domainLabel(domain: LegacySurfaceDomain) {
  if (domain === "inventory") return "Inventory";
  if (domain === "assets") return "Assets";
  return "Events";
}

function mapDomainToReportTab(domain: LegacySurfaceDomain): ReportTab {
  if (domain === "inventory") return "inventory";
  if (domain === "assets") return "assets";
  return "events";
}

function primaryDomainAction(domain: LegacySurfaceDomain): {
  href: string;
  label: string;
  secondaryHref: string;
  secondaryLabel: string;
} {
  if (domain === "inventory") {
    return {
      href: "/inventory",
      label: "Open inventory",
      secondaryHref: "/inventory/reports/new",
      secondaryLabel: "Log inventory",
    };
  }
  if (domain === "assets") {
    return {
      href: "/assets",
      label: "Open assets",
      secondaryHref: "/assets/new",
      secondaryLabel: "Add asset record",
    };
  }
  return {
    href: "/events",
    label: "Open events",
    secondaryHref: "/events/new",
    secondaryLabel: "Create event",
  };
}

function renderEventsSection(params: {
  report: Awaited<ReturnType<typeof getReportsData>>;
  canViewFinancial: boolean;
  timezone?: string;
  currency?: string;
  primaryDomain: LegacySurfaceDomain;
}) {
  const { report, canViewFinancial, timezone, currency, primaryDomain } = params;
  const primaryAction = primaryDomainAction(primaryDomain);
  const domainMetrics = report.domainMetrics;
  const weeklySalesTrend = selectTrendPoints(domainMetrics, "weekly_sales");
  const monthlySalesTrend = selectTrendPoints(domainMetrics, "monthly_sales");
  const weeklySales =
    weeklySalesTrend.length > 0
      ? weeklySalesTrend.map((point) => ({
          label: point.label,
          tickets: point.value,
          revenue: typeof point.meta?.revenue === "number" ? point.meta.revenue : 0,
        }))
      : report.weeklySales;
  const monthlySales =
    monthlySalesTrend.length > 0
      ? monthlySalesTrend.map((point) => ({
          label: point.label,
          tickets: point.value,
          revenue: typeof point.meta?.revenue === "number" ? point.meta.revenue : 0,
        }))
      : report.monthlySales;

  const eventMetricCards = [
    {
      label: "Weekly Sales",
      value: weeklySales[weeklySales.length - 1]?.tickets ?? 0,
    },
    {
      label: "Monthly Sales",
      value: monthlySales[monthlySales.length - 1]?.tickets ?? 0,
    },
    {
      label: "Expected Attendance",
      value: selectTotalValue(
        domainMetrics,
        "expected_attendance",
        report.eventSummaryRows.reduce((sum, row) => sum + row.expected_attendees, 0),
      ),
    },
    {
      label: "Actual Attendance",
      value: selectTotalValue(
        domainMetrics,
        "actual_attendance",
        report.eventSummaryRows.reduce((sum, row) => sum + row.actual_attendees, 0),
      ),
    },
  ];

  const attendanceRanking = selectRanking(domainMetrics, "attendance_report");
  const attendanceReport =
    attendanceRanking.length > 0
      ? attendanceRanking.map((row) => ({
          name: row.label,
          attendance: row.value,
        }))
      : report.attendanceReport;
  const revenueRanking = selectRanking(domainMetrics, "revenue_report");
  const revenueReport =
    revenueRanking.length > 0
      ? revenueRanking.map((row) => ({
          name: row.label,
          revenue: row.value,
        }))
      : report.revenueReport;

  if (report.eventSummaryRows.length === 0) {
    return (
      <section className="rounded-[1.75rem] border border-border/70 bg-gradient-to-b from-card to-card/92 p-6 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.82)]">
        <h2 className="text-lg font-semibold text-foreground">No event reports yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {primaryDomain === "events"
            ? "Event reports become available after your first event record."
            : `Your workspace is currently more active in ${domainLabel(primaryDomain)}.`}
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href={primaryAction.secondaryHref}
            className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            {primaryAction.secondaryLabel}
          </Link>
          <Link
            href={primaryAction.href}
            className="btn-secondary rounded-xl px-4 py-2.5 text-sm font-medium"
          >
            {primaryAction.label}
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {eventMetricCards.map((metric) => (
          <article
            key={metric.label}
            className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_12px_28px_-24px_rgba(15,23,42,0.75)]"
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
            data={weeklySales.map((row) => ({
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
              weekly={weeklySales.map((row) => ({
                label: row.label,
                revenue: row.revenue,
              }))}
              monthly={monthlySales.map((row) => ({
                label: row.label,
                revenue: row.revenue,
              }))}
              currency={currency}
            />
          </ChartCard>
        ) : null}
      </section>

      <section className={`grid gap-4 ${canViewFinancial ? "xl:grid-cols-2" : "xl:grid-cols-1"}`}>
        <ChartCard title="Attendance Report" subtitle="Top events by actual attendance">
          <ReportBarChart
            data={attendanceReport.map((row) => ({
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
              data={revenueReport.map((row) => ({
                name: row.name,
                revenue: row.revenue,
              }))}
              valueKey="revenue"
              color="#7f6653"
              formatMode="currency"
              currency={currency}
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
        timezone={timezone}
        currency={currency}
      />
    </>
  );
}

function renderInventorySection(params: {
  inventory: Awaited<ReturnType<typeof getInventoryPerformanceData>>;
  canViewFinancial: boolean;
  currency?: string;
}) {
  const { inventory, canViewFinancial, currency } = params;
  const { metrics } = inventory.assessment;
  const domainMetrics = inventory.domainMetrics;
  const insights =
    selectInsights(domainMetrics).length > 0
      ? selectInsights(domainMetrics)
      : inventory.assessment.insights;
  const productCount = selectTotalValue(domainMetrics, "product_count", inventory.products.length);
  const reportCount = selectTotalValue(domainMetrics, "report_count", metrics.reportCount);
  const unitsSold = selectTotalValue(domainMetrics, "units_sold", metrics.totalUnitsSold);
  const recipeBatches = selectTotalValue(
    domainMetrics,
    "recipe_batches_sold",
    metrics.totalRecipeBatchesSold,
  );
  const lowStockCount = selectTotalValue(
    domainMetrics,
    "low_stock_count",
    metrics.lowStockProductCount,
  );
  const totalRevenue = selectTotalValue(domainMetrics, "revenue", metrics.totalRevenue);
  const totalGrossProfit = selectTotalValue(
    domainMetrics,
    "gross_profit",
    metrics.totalGrossProfit,
  );
  const topSellingRanking = selectRanking(domainMetrics, "top_selling_products");
  const topSellingProducts =
    topSellingRanking.length > 0
      ? topSellingRanking.map((row) => ({
          name: row.label,
          units: row.value,
        }))
      : metrics.topSellingProducts.map((row) => ({
          name: row.productName,
          units: row.value,
        }));
  const highWasteRanking = selectRanking(domainMetrics, "high_waste_products");
  const highWasteProducts =
    highWasteRanking.length > 0
      ? highWasteRanking.map((row) => ({
          name: row.label,
          waste: row.value,
        }))
      : metrics.highWasteProducts.map((row) => ({
          name: row.productName,
          waste: row.wasteUnits,
        }));

  if (inventory.products.length === 0) {
    return (
      <section className="rounded-[1.75rem] border border-border/70 bg-gradient-to-b from-card to-card/92 p-6 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.82)]">
        <h2 className="text-lg font-semibold text-foreground">No inventory products yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add products and daily inventory logs to unlock inventory reports.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/inventory/products/new"
            className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            Add product
          </Link>
          <Link
            href="/inventory"
            className="btn-secondary rounded-xl px-4 py-2.5 text-sm font-medium"
          >
            Open inventory
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section
        className={`grid gap-4 ${canViewFinancial ? "sm:grid-cols-2 xl:grid-cols-7" : "sm:grid-cols-2 xl:grid-cols-5"}`}
      >
        <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.72)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Products</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(productCount)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.72)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Closed Reports</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(reportCount)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.72)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Units Sold</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(unitsSold)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.72)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Recipe Batches Sold</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {recipeBatches.toFixed(2)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.72)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Low Stock</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(lowStockCount)}
          </p>
        </article>
        {canViewFinancial ? (
          <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.72)]">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {formatCurrency(totalRevenue, currency)}
            </p>
          </article>
        ) : null}
        {canViewFinancial ? (
          <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.72)]">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Gross Profit</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {formatCurrency(totalGrossProfit, currency)}
            </p>
          </article>
        ) : null}
      </section>

      <section className="grid gap-4 xl:grid-cols-2">
        <ChartCard title="Top-Selling Products" subtitle="By finalized units sold">
          <ReportBarChart
            data={topSellingProducts}
            valueKey="units"
            color="#cf8312"
          />
        </ChartCard>
        <ChartCard title="High-Waste Products" subtitle="By accumulated waste units">
          <ReportBarChart
            data={highWasteProducts}
            valueKey="waste"
            color="#7f6653"
          />
        </ChartCard>
      </section>

      <section className="rounded-[1.75rem] border border-border/70 bg-gradient-to-b from-card to-card/92 p-5 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.82)]">
        <h3 className="text-base font-semibold text-foreground">Inventory Signals</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {insights.map((insight) => (
            <li key={insight.key} className="rounded-xl border border-border/70 bg-background/80 px-3 py-2">
              {insight.message}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function renderAssetsSection(params: {
  assets: Awaited<ReturnType<typeof getAssetUtilizationData>>;
  canViewFinancial: boolean;
  currency?: string;
  timezone?: string;
}) {
  const { assets, canViewFinancial, currency, timezone } = params;
  const { metrics } = assets.assessment;
  const domainMetrics = assets.domainMetrics;
  const insights =
    selectInsights(domainMetrics).length > 0
      ? selectInsights(domainMetrics)
      : assets.assessment.insights;
  const recordCount = selectTotalValue(domainMetrics, "record_count", metrics.recordCount);
  const totalAssets = selectTotalValue(domainMetrics, "total_assets", metrics.totalAssets);
  const totalBookedAssets = selectTotalValue(
    domainMetrics,
    "booked_assets",
    metrics.totalBookedAssets,
  );
  const totalIdleAssets = selectTotalValue(
    domainMetrics,
    "idle_assets",
    metrics.totalIdleAssets,
  );
  const revenuePerAssetMetric = selectRatioMetric(domainMetrics, "revenue_per_asset");
  const revenuePerAsset =
    revenuePerAssetMetric && (revenuePerAssetMetric.denominator ?? 0) > 0
      ? revenuePerAssetMetric.value
      : metrics.revenuePerAsset;

  if (assets.records.length === 0) {
    return (
      <section className="rounded-[1.75rem] border border-border/70 bg-gradient-to-b from-card to-card/92 p-6 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.82)]">
        <h2 className="text-lg font-semibold text-foreground">No asset records yet</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Add asset utilization entries to generate asset reports.
        </p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link
            href="/assets/new"
            className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            Add asset record
          </Link>
          <Link
            href="/assets"
            className="btn-secondary rounded-xl px-4 py-2.5 text-sm font-medium"
          >
            Open assets
          </Link>
        </div>
      </section>
    );
  }

  return (
    <>
      <section
        className={`grid gap-4 ${canViewFinancial ? "sm:grid-cols-2 xl:grid-cols-5" : "sm:grid-cols-2 xl:grid-cols-4"}`}
      >
        <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.72)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Records</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(recordCount)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.72)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Assets</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(totalAssets)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.72)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Booked Assets</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(totalBookedAssets)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.72)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Idle Assets</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(totalIdleAssets)}
          </p>
        </article>
        {canViewFinancial ? (
          <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.72)]">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Revenue per Asset</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {revenuePerAsset === null
                ? "--"
                : formatCurrency(revenuePerAsset, currency)}
            </p>
          </article>
        ) : null}
      </section>

      <section className="rounded-[1.75rem] border border-border/70 bg-gradient-to-b from-card to-card/92 p-5 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.82)]">
        <h3 className="text-base font-semibold text-foreground">Latest Asset Records</h3>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Asset</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Booked</th>
                <th className="px-3 py-2">Idle</th>
                {canViewFinancial ? <th className="px-3 py-2">Revenue</th> : null}
              </tr>
            </thead>
            <tbody>
              {assets.records.slice(0, 10).map((row) => (
                <tr key={row.id} className="rounded-xl bg-background/80 text-foreground">
                  <td className="rounded-l-xl px-3 py-3 text-muted-foreground">
                    {formatInTimezone(row.record_date, timezone, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-3 py-3 font-medium">{row.asset_name}</td>
                  <td className="px-3 py-3">{formatNumber(row.total_assets)}</td>
                  <td className="px-3 py-3">{formatNumber(row.booked_assets)}</td>
                  <td className="px-3 py-3">{formatNumber(row.idle_assets)}</td>
                  {canViewFinancial ? (
                    <td className="rounded-r-xl px-3 py-3">
                      {row.revenue === null ? "--" : formatCurrency(row.revenue, currency)}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border/70 bg-gradient-to-b from-card to-card/92 p-5 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.82)]">
        <h3 className="text-base font-semibold text-foreground">Asset Signals</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          {insights.map((insight) => (
            <li key={insight.key} className="rounded-xl border border-border/70 bg-background/80 px-3 py-2">
              {insight.message}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

function renderCombinedSection(params: {
  report: Awaited<ReturnType<typeof getReportsData>>;
  inventory: Awaited<ReturnType<typeof getInventoryPerformanceData>>;
  assets: Awaited<ReturnType<typeof getAssetUtilizationData>>;
  canViewFinancial: boolean;
  currency?: string;
}) {
  const { report, inventory, assets, canViewFinancial, currency } = params;
  const eventRecordCount = selectTotalValue(
    report.domainMetrics,
    "total_events",
    report.eventSummaryRows.length,
  );
  const inventoryReportCount = selectTotalValue(
    inventory.domainMetrics,
    "report_count",
    inventory.assessment.metrics.reportCount,
  );
  const assetRecordCount = selectTotalValue(
    assets.domainMetrics,
    "record_count",
    assets.records.length,
  );
  const inventoryRevenue = selectTotalValue(
    inventory.domainMetrics,
    "revenue",
    inventory.assessment.metrics.totalRevenue,
  );
  const inventoryLeadInsight =
    selectInsights(inventory.domainMetrics)[0]?.message ??
    inventory.assessment.insights[0]?.message ??
    "No inventory signal yet.";
  const assetLeadInsight =
    selectInsights(assets.domainMetrics)[0]?.message ??
    assets.assessment.insights[0]?.message ??
    "No asset signal yet.";

  const coverage = [
    {
      key: "events",
      title: "Events",
      records: eventRecordCount,
      href: "/events",
      reportHref: "/reports?tab=events",
    },
    {
      key: "inventory",
      title: "Inventory",
      records: inventoryReportCount,
      href: "/inventory",
      reportHref: "/reports?tab=inventory",
    },
    {
      key: "assets",
      title: "Assets",
      records: assetRecordCount,
      href: "/assets",
      reportHref: "/reports?tab=assets",
    },
  ] as const;

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.72)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Event Records</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(eventRecordCount)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.72)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Closed Inventory Logs</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(inventoryReportCount)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.72)]">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Asset Records</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(assetRecordCount)}
          </p>
        </article>
        {canViewFinancial ? (
          <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.72)]">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Inventory Revenue</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {formatCurrency(inventoryRevenue, currency)}
            </p>
          </article>
        ) : (
          <article className="rounded-2xl border border-border/70 bg-gradient-to-b from-card to-card/92 p-4 shadow-[0_10px_22px_-22px_rgba(15,23,42,0.72)]">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Active Inventory Products</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {formatNumber(inventory.products.filter((row) => row.is_active).length)}
            </p>
          </article>
        )}
      </section>

      <section className="rounded-[1.75rem] border border-border/70 bg-gradient-to-b from-card to-card/92 p-5 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.82)]">
        <h3 className="text-base font-semibold text-foreground">Domain Coverage</h3>
        <div className="mt-4 grid gap-3 md:grid-cols-3">
          {coverage.map((domain) => (
            <article
              key={domain.key}
              className="rounded-2xl border border-border/70 bg-background/80 p-4"
            >
              <p className="text-sm font-semibold text-foreground">{domain.title}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">
                {formatNumber(domain.records)} records
              </p>
              <div className="mt-4 flex gap-2">
                <Link
                  href={domain.href}
                  className="btn-secondary rounded-lg px-3 py-1.5 text-xs font-medium"
                >
                  Open
                </Link>
                <Link
                  href={domain.reportHref}
                  className="btn-primary rounded-lg px-3 py-1.5 text-xs font-semibold"
                >
                  Report
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-[1.75rem] border border-border/70 bg-gradient-to-b from-card to-card/92 p-5 shadow-[0_16px_32px_-28px_rgba(15,23,42,0.82)]">
        <h3 className="text-base font-semibold text-foreground">Latest Signals</h3>
        <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
          <li className="rounded-xl border border-border/70 bg-background/80 px-3 py-2">
            Events:{" "}
            {eventRecordCount > 0
              ? `${formatNumber(eventRecordCount)} event records available.`
              : "No event records yet."}
          </li>
          <li className="rounded-xl border border-border/70 bg-background/80 px-3 py-2">
            Inventory: {inventoryLeadInsight}
          </li>
          <li className="rounded-xl border border-border/70 bg-background/80 px-3 py-2">
            Assets: {assetLeadInsight}
          </li>
        </ul>
      </section>
    </>
  );
}

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const context = await getAuthContext();
  if (!context) {
    redirect("/");
  }

  const canViewFinancial = context.role === "owner";
  const [params, workspace, domainSignals, domainState] =
    await Promise.all([
    searchParams,
    getWorkspaceById(context.workspaceId),
    getDomainUsageSignals(context.workspaceId),
    resolveWorkspaceDomainState(context.workspaceId),
  ]);
  const primaryDomain = domainState.primarySurfaceDomain;
  const defaultTab = mapDomainToReportTab(primaryDomain);
  const allowedDomainTabs = new Set<ReportTab>(
    domainState.enabledSurfaceDomains.map((domain) => mapDomainToReportTab(domain)),
  );
  const requestedTab = resolveTab(params.tab, defaultTab);
  const tab =
    requestedTab === "combined" || allowedDomainTabs.has(requestedTab)
      ? requestedTab
      : defaultTab;
  const visibleTabs = TAB_ITEMS.filter(
    (item) => item.key === "combined" || allowedDomainTabs.has(item.key),
  );

  let section: ReactNode = null;

  if (tab === "events") {
    const report = await getReportsData();
    section = renderEventsSection({
      report,
      canViewFinancial,
      timezone: workspace?.timezone,
      currency: workspace?.currency,
      primaryDomain,
    });
  } else if (tab === "inventory") {
    const inventory = await getInventoryPerformanceData();
    section = renderInventorySection({
      inventory,
      canViewFinancial,
      currency: workspace?.currency,
    });
  } else if (tab === "assets") {
    const assets = await getAssetUtilizationData();
    section = renderAssetsSection({
      assets,
      canViewFinancial,
      currency: workspace?.currency,
      timezone: workspace?.timezone,
    });
  } else {
    const [report, inventory, assets] = await Promise.all([
      getReportsData(),
      getInventoryPerformanceData(),
      getAssetUtilizationData(),
    ]);
    section = renderCombinedSection({
      report,
      inventory,
      assets,
      canViewFinancial,
      currency: workspace?.currency,
    });
  }

  return (
    <div className="space-y-7">
      <header className="rounded-[1.85rem] border border-border/70 bg-gradient-to-br from-card via-card to-surface/80 p-6 shadow-[0_18px_36px_-30px_rgba(15,23,42,0.88)]">
        <p className="text-[0.72rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
          Analytics Workspace
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-foreground">Reports</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cross-domain reporting with persisted workspace domain focus and legacy heuristic fallback.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          Primary domain:{" "}
          <span className="font-semibold text-foreground">
            {domainLabel(primaryDomain)}
          </span>
        </p>
        <nav className="mt-4 flex flex-wrap gap-2 rounded-2xl border border-border/70 bg-background/60 p-2">
          {visibleTabs.map((item) => {
            const active = item.key === tab;
            return (
              <Link
                key={item.key}
                href={tabHref(item.key, defaultTab)}
                className={
                  active
                    ? "btn-primary rounded-xl px-3.5 py-2 text-sm font-semibold"
                    : "btn-secondary rounded-xl px-3.5 py-2 text-sm font-medium"
                }
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        {tab === "events" && canViewFinancial && domainSignals.counts.events > 0 ? (
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

      {section}
    </div>
  );
}

