import { getAuthContext } from "@/lib/auth";
import { getAssetUtilizationData } from "@/lib/asset";
import { formatCurrency, formatInTimezone, formatNumber } from "@/lib/utils";
import { getWorkspaceById } from "@/lib/workspace";
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

export default async function AssetsPage() {
  const context = await getAuthContext();
  if (!context) {
    redirect("/");
  }

  const canViewFinancial = context.role === "owner";
  const [data, workspace] = await Promise.all([
    getAssetUtilizationData(),
    getWorkspaceById(context.workspaceId),
  ]);

  if (data.records.length === 0) {
    return (
      <div className="space-y-6">
        <header className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_8px_24px_-22px_rgba(15,23,42,0.8)]">
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-foreground">Assets</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Track asset utilization with deterministic occupancy and idle metrics.
          </p>
        </header>

        <section className="rounded-3xl border border-border/60 bg-card/90 p-6 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.75)]">
          <h2 className="text-lg font-semibold text-foreground">Get started</h2>
          <ol className="mt-3 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Add your first asset record</li>
            <li>Log total, booked, and idle assets</li>
            <li>Review deterministic utilization insights</li>
          </ol>
          <div className="mt-5">
            <Link
              href="/assets/new"
              className="btn-primary inline-flex rounded-xl px-4 py-2.5 text-sm font-semibold"
            >
              Add asset record
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
          <h1 className="text-3xl font-semibold tracking-tight text-foreground">Assets</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Monitor utilization, idle capacity, and asset productivity for your workspace.
          </p>
        </div>
        <Link
          href="/assets/new"
          className="btn-primary rounded-xl px-4 py-2.5 text-sm font-semibold"
        >
          Add asset record
        </Link>
      </header>

      <section
        className={`grid gap-4 ${canViewFinancial ? "sm:grid-cols-2 xl:grid-cols-4" : "sm:grid-cols-2 xl:grid-cols-3"}`}
      >
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Utilization Rate</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatRate(metrics.utilizationRate)}
          </p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Idle Rate</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">{formatRate(metrics.idleRate)}</p>
        </article>
        <article className="rounded-2xl border border-border/60 bg-card p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Total Assets</p>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {formatNumber(metrics.totalAssets)}
          </p>
        </article>
        {canViewFinancial ? (
          <article className="rounded-2xl border border-border/60 bg-card p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Revenue per Asset
            </p>
            <p className="mt-2 text-2xl font-semibold text-foreground">
              {metrics.revenuePerAsset === null
                ? "--"
                : formatCurrency(metrics.revenuePerAsset, workspace?.currency)}
            </p>
          </article>
        ) : null}
      </section>

      <section className="rounded-3xl border border-border/60 bg-card/90 p-5 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.75)]">
        <header>
          <h2 className="text-base font-semibold text-foreground">
            Deterministic Asset Utilization Insights
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Rule-based insights from current asset records.
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
          <h2 className="text-base font-semibold text-foreground">Asset Records</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Latest utilization snapshots for your workspace.
          </p>
        </header>

        <div className="overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-y-2 text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="px-3 py-2">Date</th>
                <th className="px-3 py-2">Asset</th>
                <th className="px-3 py-2">Total</th>
                <th className="px-3 py-2">Booked</th>
                <th className="px-3 py-2">Idle</th>
                <th className="px-3 py-2">Utilization</th>
                {canViewFinancial ? <th className="px-3 py-2">Revenue</th> : null}
              </tr>
            </thead>
            <tbody>
              {data.records.map((row) => {
                const rowUtilization =
                  row.total_assets > 0 ? row.booked_assets / row.total_assets : null;

                return (
                  <tr key={row.id} className="rounded-xl bg-muted/35 text-foreground">
                    <td className="rounded-l-xl px-3 py-3 text-muted-foreground">
                      {formatInTimezone(row.record_date, workspace?.timezone, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-3 font-medium">{row.asset_name}</td>
                    <td className="px-3 py-3">{formatNumber(row.total_assets)}</td>
                    <td className="px-3 py-3">{formatNumber(row.booked_assets)}</td>
                    <td className="px-3 py-3">{formatNumber(row.idle_assets)}</td>
                    <td className="px-3 py-3">{formatRate(rowUtilization)}</td>
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

