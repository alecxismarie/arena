import { getAuthContext } from "@/lib/auth";
import {
  getDailyBusinessSummary,
  normalizeInventoryDateKey,
} from "@/lib/inventory";
import {
  formatCurrency,
  formatDateKeyInTimezone,
  formatInTimezone,
  formatNumber,
} from "@/lib/utils";
import { getCurrentWorkspace } from "@/lib/workspace";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type InventoryPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function formatRate(value: number | null) {
  if (value === null) return "--";
  return `${(value * 100).toFixed(1)}%`;
}

function formatRecipeBatches(units: number, yieldPerRecipe: number) {
  if (!Number.isFinite(units) || !Number.isFinite(yieldPerRecipe) || yieldPerRecipe <= 0) {
    return "--";
  }
  return (units / yieldPerRecipe).toFixed(2);
}

function insightClass(level: "positive" | "warning" | "neutral") {
  if (level === "positive") {
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  }
  if (level === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-700";
  }
  return "border-border bg-background text-muted-foreground";
}

function extractDateParam(raw: string | string[] | undefined) {
  if (Array.isArray(raw)) {
    return normalizeInventoryDateKey(raw[0]);
  }
  return normalizeInventoryDateKey(raw);
}

function dateFromKey(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function formatAuditEntry(
  actor: string | null,
  timestamp: Date | null,
  timezone?: string,
) {
  if (!actor || !timestamp) return "--";
  return `${actor} (${formatInTimezone(timestamp, timezone, {
    hour: "numeric",
    minute: "2-digit",
  })})`;
}

const FINANCIAL_INSIGHT_KEYS = new Set(["strong_sales_day", "weak_sales_day", "healthy_gross_margin", "margin_pressure"]);

export default async function InventoryPage({ searchParams }: InventoryPageProps) {
  const context = await getAuthContext();
  if (!context) {
    redirect("/");
  }

  const [workspace, params] = await Promise.all([getCurrentWorkspace(), searchParams]);
  const defaultDateKey = formatDateKeyInTimezone(new Date(), workspace?.timezone);
  const selectedDate =
    extractDateParam(params.date) ?? normalizeInventoryDateKey(defaultDateKey) ?? defaultDateKey;

  const summary = await getDailyBusinessSummary(context.workspaceId, selectedDate);
  const canViewFinancial = context.role === "owner";
  const insights = canViewFinancial
    ? summary.insights
    : summary.insights.filter((insight) => !FINANCIAL_INSIGHT_KEYS.has(insight.key));
  const selectedDateLabel = formatInTimezone(dateFromKey(selectedDate), workspace?.timezone, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  if (summary.productCount === 0) {
    return (
      <div className="space-y-6">
        <header className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.8)]">
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Inventory Daily Summary
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Track what sold today, what earned today, and what needs attention while you are away
            from the store.
          </p>
        </header>

        <section className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.75)]">
          <h2 className="text-lg font-semibold text-foreground">Set up inventory reporting</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Create products with selling and cost price</li>
            <li>Log one daily report per product</li>
            <li>Review computed sales, revenue, and gross profit</li>
          </ol>
          <div className="mt-5 flex flex-wrap gap-3">
            {canViewFinancial ? (
              <Link
                href="/inventory/products/new"
                className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
              >
                Add product
              </Link>
            ) : null}
            <Link
              href="/inventory/products"
              className="btn-secondary rounded-xl px-4 py-2.5 text-sm font-medium"
            >
              View products
            </Link>
            <Link
              href="/inventory/reports/new"
              className="btn-secondary rounded-xl px-4 py-2.5 text-sm font-medium"
            >
              Add daily report
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.8)]">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Inventory Daily Summary
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {selectedDateLabel}: daily sales, revenue, gross profit, and risk signals from product
            closing reports.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <form action="/inventory" method="get" className="flex items-end gap-2">
            <label className="space-y-1 text-xs text-muted-foreground">
              <span className="block">Summary date</span>
              <input
                type="date"
                name="date"
                defaultValue={selectedDate}
                className="w-[170px] rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-accent/70 focus:ring-2 focus:ring-accent/10"
              />
            </label>
            <button
              type="submit"
              className="btn-secondary rounded-xl px-4 py-2.5 text-sm font-medium"
            >
              View day
            </button>
          </form>
          {canViewFinancial ? (
            <Link
              href="/inventory/products/new"
              className="btn-secondary rounded-xl px-4 py-2.5 text-sm font-medium"
            >
              Add product
            </Link>
          ) : null}
          <Link
            href="/inventory/products"
            className="btn-secondary rounded-xl px-4 py-2.5 text-sm font-medium"
          >
            View products
          </Link>
          <Link
            href="/inventory/reports/new"
            className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
          >
            Add daily report
          </Link>
        </div>
      </header>

      <section
        className={`grid gap-4 ${canViewFinancial ? "sm:grid-cols-2 xl:grid-cols-7" : "sm:grid-cols-2 xl:grid-cols-5"}`}
      >
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Units Sold</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(summary.metrics.totalUnitsSold)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Recipe Batches Sold</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {summary.metrics.totalRecipeBatchesSold.toFixed(2)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Closed Reports</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(summary.metrics.reportCount)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Low Stock Products</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(summary.metrics.lowStockProducts.length)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">High Waste Products</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(summary.metrics.highWasteProducts.length)}
          </p>
        </article>
        {canViewFinancial ? (
          <article className="rounded-2xl border border-border/60 bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Revenue</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {formatCurrency(summary.metrics.totalRevenue, workspace?.currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              COGS: {formatCurrency(summary.metrics.totalCogs, workspace?.currency)}
            </p>
          </article>
        ) : null}
        {canViewFinancial ? (
          <article className="rounded-2xl border border-border/60 bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Gross Profit</p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {formatCurrency(summary.metrics.totalGrossProfit, workspace?.currency)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Gross Margin: {formatRate(summary.metrics.grossMarginRate)}
            </p>
          </article>
        ) : null}
      </section>

      <section className="rounded-3xl border border-border/60 bg-card/90 p-5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.75)]">
        <header>
          <h2 className="text-base font-semibold text-foreground">Deterministic Daily Insights</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Operator-focused daily signals generated from submitted reports and computed financials.
          </p>
        </header>
        <ul className="mt-4 grid gap-2 md:grid-cols-2">
          {insights.map((insight) => (
            <li
              key={insight.key}
              className={`rounded-xl border px-3 py-2 text-sm ${insightClass(insight.level)}`}
            >
              {insight.message}
            </li>
          ))}
        </ul>
      </section>

      <section className={`grid gap-4 ${canViewFinancial ? "xl:grid-cols-3" : "xl:grid-cols-2"}`}>
        <article className="rounded-3xl border border-border/60 bg-card/90 p-5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.75)]">
          <h3 className="text-base font-semibold text-foreground">Top-selling products</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {summary.metrics.topSellingProducts.length === 0 ? (
              <li className="text-muted-foreground">No product sales recorded for this day.</li>
            ) : (
              summary.metrics.topSellingProducts.map((entry) => (
                <li
                  key={entry.productId}
                  className="flex items-center justify-between rounded-xl border border-border/70 bg-background/70 px-3 py-2"
                >
                  <span className="font-medium text-foreground">{entry.productName}</span>
                  <span className="text-muted-foreground">{formatNumber(entry.value)} units</span>
                </li>
              ))
            )}
          </ul>
        </article>

        {canViewFinancial ? (
          <article className="rounded-3xl border border-border/60 bg-card/90 p-5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.75)]">
            <h3 className="text-base font-semibold text-foreground">Top gross-profit products</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {summary.metrics.topGrossProfitProducts.length === 0 ? (
                <li className="text-muted-foreground">No gross-profit data for this day.</li>
              ) : (
                summary.metrics.topGrossProfitProducts.map((entry) => (
                  <li
                    key={entry.productId}
                    className="flex items-center justify-between rounded-xl border border-border/70 bg-background/70 px-3 py-2"
                  >
                    <span className="font-medium text-foreground">{entry.productName}</span>
                    <span className="text-muted-foreground">
                      {formatCurrency(entry.value, workspace?.currency)}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </article>
        ) : null}

        <article className="rounded-3xl border border-border/60 bg-card/90 p-5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.75)]">
          <h3 className="text-base font-semibold text-foreground">Risk watchlist</h3>
          <div className="mt-3 space-y-3 text-sm">
            <div>
              <p className="font-medium text-foreground">Low stock</p>
              <ul className="mt-2 space-y-2">
                {summary.metrics.lowStockProducts.length === 0 ? (
                  <li className="text-muted-foreground">No low-stock products for this day.</li>
                ) : (
                  summary.metrics.lowStockProducts.map((entry) => (
                    <li
                      key={`${entry.productId}-${entry.reportDate.toISOString()}`}
                      className="flex items-center justify-between rounded-xl border border-border/70 bg-background/70 px-3 py-2"
                    >
                      <span className="font-medium text-foreground">{entry.productName}</span>
                      <span className="text-muted-foreground">
                        {formatNumber(entry.endingStock)} left
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            <div>
              <p className="font-medium text-foreground">High waste</p>
              <ul className="mt-2 space-y-2">
                {summary.metrics.highWasteProducts.length === 0 ? (
                  <li className="text-muted-foreground">No high-waste products for this day.</li>
                ) : (
                  summary.metrics.highWasteProducts.map((entry) => (
                    <li
                      key={entry.productId}
                      className="flex items-center justify-between rounded-xl border border-border/70 bg-background/70 px-3 py-2"
                    >
                      <span className="font-medium text-foreground">{entry.productName}</span>
                      <span className="text-muted-foreground">
                        {formatNumber(entry.wasteUnits)} waste units
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </article>
      </section>

      <section className="rounded-3xl border border-border/60 bg-card/90 p-5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.75)]">
        <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-foreground">Daily product reports</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.reports.length === 0
                ? "No inventory entries yet for the selected date."
                : "Opening and closing logs for the selected date. Sales metrics finalize after closing."}
            </p>
          </div>
          <Link
            href="/inventory/reports/new"
            className="btn-secondary rounded-xl px-4 py-2 text-sm font-medium"
          >
            Log daily report
          </Link>
        </header>

        {summary.reports.length === 0 ? (
          <div className="rounded-xl border border-border/70 bg-background/70 px-4 py-4 text-sm text-muted-foreground">
            No reports submitted for {selectedDateLabel}. Submit daily product reports to populate
            today&apos;s business summary.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full border-separate border-spacing-y-2 text-sm">
              <thead>
                <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Product</th>
                  <th className="px-3 py-2">Yield</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2">Opening Logged</th>
                  <th className="px-3 py-2">Closing Logged</th>
                  <th className="px-3 py-2">Beginning</th>
                  <th className="px-3 py-2">Added</th>
                  <th className="px-3 py-2">Ending</th>
                  <th className="px-3 py-2">Waste</th>
                  <th className="px-3 py-2">Units Sold</th>
                  <th className="px-3 py-2">Recipe Sold</th>
                  {canViewFinancial ? <th className="px-3 py-2">Revenue</th> : null}
                  {canViewFinancial ? <th className="px-3 py-2">COGS</th> : null}
                  {canViewFinancial ? <th className="px-3 py-2">Gross Profit</th> : null}
                </tr>
              </thead>
              <tbody>
                {summary.reports.map((row) => (
                  <tr key={row.id} className="rounded-xl bg-muted/35 text-foreground">
                    <td className="rounded-l-xl px-3 py-3 text-muted-foreground">
                      {formatInTimezone(row.report_date, workspace?.timezone, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-3 font-medium">{row.product_name}</td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {formatNumber(row.product_yield_per_recipe)} pcs/recipe
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={`inline-flex rounded-lg border px-2.5 py-1 text-xs font-medium ${
                          row.is_finalized
                            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "border-amber-200 bg-amber-50 text-amber-700"
                        }`}
                      >
                        {row.is_finalized ? "Finalized" : "Opening logged"}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {formatAuditEntry(
                        row.opening_stock_recorded_by,
                        row.opening_stock_recorded_at,
                        workspace?.timezone,
                      )}
                    </td>
                    <td className="px-3 py-3 text-muted-foreground">
                      {formatAuditEntry(
                        row.closing_stock_recorded_by,
                        row.closing_stock_recorded_at,
                        workspace?.timezone,
                      )}
                    </td>
                    <td className="px-3 py-3">{formatNumber(row.beginning_stock)}</td>
                    <td className="px-3 py-3">
                      {row.is_finalized ? formatNumber(row.stock_added) : "--"}
                    </td>
                    <td className="px-3 py-3">
                      {row.is_finalized ? formatNumber(row.ending_stock) : "--"}
                    </td>
                    <td className="px-3 py-3">
                      {row.is_finalized ? formatNumber(row.waste_units) : "--"}
                    </td>
                    <td className="px-3 py-3">
                      {row.is_finalized ? formatNumber(row.units_sold) : "--"}
                    </td>
                    <td className="px-3 py-3">
                      {row.is_finalized
                        ? formatRecipeBatches(row.units_sold, row.product_yield_per_recipe)
                        : "--"}
                    </td>
                    {canViewFinancial ? (
                      <td className="px-3 py-3">
                        {row.is_finalized
                          ? formatCurrency(row.revenue, workspace?.currency)
                          : "--"}
                      </td>
                    ) : null}
                    {canViewFinancial ? (
                      <td className="px-3 py-3">
                        {row.is_finalized
                          ? formatCurrency(row.cogs, workspace?.currency)
                          : "--"}
                      </td>
                    ) : null}
                    {canViewFinancial ? (
                      <td className="rounded-r-xl px-3 py-3">
                        {row.is_finalized
                          ? formatCurrency(row.gross_profit, workspace?.currency)
                          : "--"}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
