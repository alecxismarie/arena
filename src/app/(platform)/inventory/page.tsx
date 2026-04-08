import { getAuthContext } from "@/lib/auth";
import { getInventoryPerformanceData } from "@/lib/inventory";
import { formatCurrency, formatInTimezone, formatNumber } from "@/lib/utils";
import { getCurrentWorkspace } from "@/lib/workspace";
import Link from "next/link";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

function formatRate(value: number | null) {
  if (value === null) return "--";
  return `${(value * 100).toFixed(1)}%`;
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

export default async function InventoryPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/");
  }

  const canViewFinancial = context.role === "owner";
  const [data, workspace] = await Promise.all([
    getInventoryPerformanceData(),
    getCurrentWorkspace(),
  ]);

  if (data.records.length === 0) {
    return (
      <div className="space-y-6">
        <header className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.8)]">
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">
            Inventory
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Track inventory movement with deterministic inventory performance metrics.
          </p>
        </header>

        <section className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.75)]">
          <h2 className="text-lg font-semibold text-foreground">Get started</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Add your first inventory record</li>
            <li>Log units in, units out, waste, and remaining stock</li>
            <li>Review deterministic inventory insights</li>
          </ol>
          <div className="mt-5">
            <Link
              href="/inventory/new"
              className="btn-primary inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              Add inventory record
            </Link>
          </div>
        </section>
      </div>
    );
  }

  const { metrics, insights } = data.assessment;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4 rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.8)]">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">
            Inventory
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Monitor sell-through, waste, and stock health for your workspace inventory.
          </p>
        </div>
        <Link
          href="/inventory/new"
          className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          Add inventory record
        </Link>
      </header>

      <section
        className={`grid gap-4 ${canViewFinancial ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2 xl:grid-cols-3"}`}
      >
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Units In</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(metrics.totalUnitsIn)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Units Out</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(metrics.totalUnitsOut)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Sell-Through</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatRate(metrics.sellThroughRate)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Waste Rate</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatRate(metrics.wasteRate)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Remaining Stock Snapshot
          </p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {metrics.latestRemainingStock === null
              ? "--"
              : formatNumber(metrics.latestRemainingStock)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Low-Stock Records</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(metrics.lowStockRecordCount)}
          </p>
        </article>
        {canViewFinancial ? (
          <article className="rounded-2xl border border-border/60 bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Revenue per Unit Sold
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {metrics.revenuePerUnitSold === null
                ? "--"
                : formatCurrency(metrics.revenuePerUnitSold, workspace?.currency)}
            </p>
          </article>
        ) : null}
      </section>

      <section className="rounded-3xl border border-border/60 bg-card/90 p-5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.75)]">
        <header>
          <h2 className="text-base font-semibold text-foreground">
            Deterministic Inventory Insights
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rule-based insights from current inventory records.
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

      <section className="rounded-3xl border border-border/60 bg-card/90 p-5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.75)]">
        <header className="mb-4">
          <h2 className="text-base font-semibold text-foreground">Inventory Records</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Latest stock records for your workspace.
          </p>
        </header>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Product</th>
                <th className="px-3 py-2">Units In</th>
                <th className="px-3 py-2">Units Out</th>
                <th className="px-3 py-2">Waste</th>
                <th className="px-3 py-2">Remaining</th>
                <th className="px-3 py-2">Sell-Through</th>
                {canViewFinancial ? <th className="px-3 py-2">Revenue</th> : null}
              </tr>
            </thead>
            <tbody>
              {data.records.map((row) => {
                const rowSellThrough =
                  row.units_in > 0 ? row.units_out / row.units_in : null;

                return (
                  <tr key={row.id} className="rounded-xl bg-muted/35 text-foreground">
                    <td className="rounded-l-xl px-3 py-3 text-muted-foreground">
                      {formatInTimezone(row.record_date, workspace?.timezone, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-3 font-medium">{row.product_name}</td>
                    <td className="px-3 py-3">{formatNumber(row.units_in)}</td>
                    <td className="px-3 py-3">{formatNumber(row.units_out)}</td>
                    <td className="px-3 py-3">{formatNumber(row.waste_units)}</td>
                    <td className="px-3 py-3">{formatNumber(row.remaining_stock)}</td>
                    <td className="px-3 py-3">{formatRate(rowSellThrough)}</td>
                    {canViewFinancial ? (
                      <td className="rounded-r-xl px-3 py-3">
                        {row.revenue === null
                          ? "--"
                          : formatCurrency(row.revenue, workspace?.currency)}
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
