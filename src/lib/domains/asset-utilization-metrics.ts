import { format } from "date-fns";
import { assetUtilizationInsightAdapter } from "@/lib/domains/asset-utilization-adapter";
import {
  InsightMetricItem,
  RankingMetricItem,
  StandardizedDomainMetricsContract,
} from "@/lib/domains/metrics-contract";
import {
  AssetRecordItem,
  AssetUtilizationAssessment,
} from "@/lib/asset/types";

// Phase 2C adoption scope:
// this standardized contract implementation is asset_utilization-only.
// Event and inventory standardized adapters remain unchanged in this phase.

type AssetTotalKey =
  | "record_count"
  | "total_assets"
  | "booked_assets"
  | "idle_assets"
  | "revenue";

type AssetRatioKey =
  | "utilization_rate"
  | "idle_rate"
  | "revenue_per_asset";

type AssetTrendKey =
  | "daily_utilization_rate"
  | "daily_idle_rate"
  | "daily_revenue";

type AssetRankingKey =
  | "top_utilized_assets"
  | "top_idle_assets"
  | "top_revenue_assets";

export type AssetUtilizationDomainMetrics = StandardizedDomainMetricsContract<
  "asset_utilization",
  AssetTotalKey,
  AssetRatioKey,
  AssetTrendKey,
  AssetRankingKey
>;

export type AssetUtilizationMetricsInput = {
  records: AssetRecordItem[];
  now?: Date;
};

export type AssetUtilizationMetricsResult = {
  metrics: AssetUtilizationDomainMetrics;
  context: {
    assessment: AssetUtilizationAssessment;
  };
};

function sortDateAsc(a: string, b: string) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function toDayDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function rate(numerator: number, denominator: number) {
  if (denominator <= 0) return 0;
  return numerator / denominator;
}

function aggregateByDay(records: AssetRecordItem[]) {
  const byDay = records.reduce(
    (acc, row) => {
      const dateKey = row.record_date.toISOString().slice(0, 10);
      const current = acc.get(dateKey) ?? {
        totalAssets: 0,
        bookedAssets: 0,
        idleAssets: 0,
        revenue: 0,
      };
      current.totalAssets += row.total_assets;
      current.bookedAssets += row.booked_assets;
      current.idleAssets += row.idle_assets;
      current.revenue += row.revenue ?? 0;
      acc.set(dateKey, current);
      return acc;
    },
    new Map<
      string,
      {
        totalAssets: number;
        bookedAssets: number;
        idleAssets: number;
        revenue: number;
      }
    >(),
  );

  return Array.from(byDay.entries())
    .sort(([a], [b]) => sortDateAsc(a, b))
    .map(([dateKey, value]) => {
      const date = toDayDate(dateKey);
      return {
        date,
        label: format(date, "MMM d"),
        utilizationRate: rate(value.bookedAssets, value.totalAssets),
        idleRate: rate(value.idleAssets, value.totalAssets),
        revenue: value.revenue,
      };
    });
}

function toPeriod(records: AssetRecordItem[]) {
  if (records.length === 0) return null;
  let min = records[0].record_date;
  let max = records[0].record_date;
  records.forEach((record) => {
    if (record.record_date < min) min = record.record_date;
    if (record.record_date > max) max = record.record_date;
  });
  return {
    from: min,
    to: max,
    label: `${format(min, "yyyy-MM-dd")} to ${format(max, "yyyy-MM-dd")}`,
  };
}

function toRanking(rows: RankingMetricItem[]) {
  return rows;
}

function toInsightItems(insights: AssetUtilizationAssessment["insights"]) {
  return insights.map(
    (insight) =>
      ({
        key: insight.key,
        level: insight.level,
        message: insight.message,
      }) satisfies InsightMetricItem,
  );
}

function aggregateByAsset(records: AssetRecordItem[]) {
  const byAsset = records.reduce(
    (acc, row) => {
      const current = acc.get(row.asset_name) ?? {
        id: row.asset_name,
        label: row.asset_name,
        totalAssets: 0,
        bookedAssets: 0,
        idleAssets: 0,
        revenue: 0,
      };
      current.totalAssets += row.total_assets;
      current.bookedAssets += row.booked_assets;
      current.idleAssets += row.idle_assets;
      current.revenue += row.revenue ?? 0;
      acc.set(row.asset_name, current);
      return acc;
    },
    new Map<
      string,
      {
        id: string;
        label: string;
        totalAssets: number;
        bookedAssets: number;
        idleAssets: number;
        revenue: number;
      }
    >(),
  );

  return Array.from(byAsset.values());
}

export function buildAssetUtilizationDomainMetrics(
  input: AssetUtilizationMetricsInput,
): AssetUtilizationMetricsResult {
  const now = input.now ?? new Date();
  const assessment = assetUtilizationInsightAdapter.computeDeterministicInsights({
    records: input.records,
  });
  const metrics = assessment.metrics;
  const byDay = aggregateByDay(input.records);
  const byAsset = aggregateByAsset(input.records);

  const topUtilizedAssets = byAsset
    .filter((row) => row.totalAssets > 0)
    .sort(
      (a, b) =>
        rate(b.bookedAssets, b.totalAssets) - rate(a.bookedAssets, a.totalAssets),
    )
    .slice(0, 5)
    .map(
      (row) =>
        ({
          id: row.id,
          label: row.label,
          value: rate(row.bookedAssets, row.totalAssets),
          meta: {
            bookedAssets: row.bookedAssets,
            totalAssets: row.totalAssets,
          },
        }) satisfies RankingMetricItem,
    );

  const topIdleAssets = byAsset
    .filter((row) => row.totalAssets > 0)
    .sort(
      (a, b) =>
        rate(b.idleAssets, b.totalAssets) - rate(a.idleAssets, a.totalAssets),
    )
    .slice(0, 5)
    .map(
      (row) =>
        ({
          id: row.id,
          label: row.label,
          value: rate(row.idleAssets, row.totalAssets),
          meta: {
            idleAssets: row.idleAssets,
            totalAssets: row.totalAssets,
          },
        }) satisfies RankingMetricItem,
    );

  const topRevenueAssets = byAsset
    .filter((row) => row.revenue > 0)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)
    .map(
      (row) =>
        ({
          id: row.id,
          label: row.label,
          value: row.revenue,
        }) satisfies RankingMetricItem,
    );

  return {
    metrics: {
      totals: {
        record_count: {
          key: "record_count",
          label: "Records",
          value: metrics.recordCount,
          unit: "count",
        },
        total_assets: {
          key: "total_assets",
          label: "Total Assets",
          value: metrics.totalAssets,
          unit: "count",
        },
        booked_assets: {
          key: "booked_assets",
          label: "Booked Assets",
          value: metrics.totalBookedAssets,
          unit: "count",
        },
        idle_assets: {
          key: "idle_assets",
          label: "Idle Assets",
          value: metrics.totalIdleAssets,
          unit: "count",
        },
        revenue: {
          key: "revenue",
          label: "Revenue",
          value: metrics.totalRevenue,
          unit: "currency",
        },
      },
      ratios: {
        utilization_rate: {
          key: "utilization_rate",
          label: "Utilization Rate",
          value: metrics.utilizationRate ?? 0,
          numerator: metrics.totalBookedAssets,
          denominator: metrics.totalAssets,
          unit: "percentage",
        },
        idle_rate: {
          key: "idle_rate",
          label: "Idle Rate",
          value: metrics.idleRate ?? 0,
          numerator: metrics.totalIdleAssets,
          denominator: metrics.totalAssets,
          unit: "percentage",
        },
        revenue_per_asset: {
          key: "revenue_per_asset",
          label: "Revenue per Asset",
          value: metrics.revenuePerAsset ?? 0,
          numerator: metrics.totalRevenue,
          denominator: metrics.totalAssets,
          unit: "ratio",
        },
      },
      trends: {
        daily_utilization_rate: {
          key: "daily_utilization_rate",
          label: "Daily Utilization Rate",
          granularity: "day",
          points: byDay.map((row) => ({
            label: row.label,
            value: row.utilizationRate,
            date: row.date,
          })),
        },
        daily_idle_rate: {
          key: "daily_idle_rate",
          label: "Daily Idle Rate",
          granularity: "day",
          points: byDay.map((row) => ({
            label: row.label,
            value: row.idleRate,
            date: row.date,
          })),
        },
        daily_revenue: {
          key: "daily_revenue",
          label: "Daily Revenue",
          granularity: "day",
          points: byDay.map((row) => ({
            label: row.label,
            value: row.revenue,
            date: row.date,
          })),
        },
      },
      rankings: {
        top_utilized_assets: toRanking(topUtilizedAssets),
        top_idle_assets: toRanking(topIdleAssets),
        top_revenue_assets: toRanking(topRevenueAssets),
      },
      insights: toInsightItems(assessment.insights),
      metadata: {
        domain: "asset_utilization",
        generatedAt: now,
        period: toPeriod(input.records),
        source: {
          mode: "deterministic",
          systems: ["asset_record"],
          notes: [
            "Asset trends and rankings are intentionally lightweight until deeper asset analytics phases.",
          ],
        },
        flags: {
          hasRecords: input.records.length > 0,
        },
      },
    },
    context: {
      assessment,
    },
  };
}

export function getAssetUtilizationMetrics(input: AssetUtilizationMetricsInput) {
  return buildAssetUtilizationDomainMetrics(input);
}

export function mapAssetUtilizationMetricsToLegacyAssessment(
  result: AssetUtilizationMetricsResult,
): AssetUtilizationAssessment {
  // Compatibility wrapper for current asset page/report consumers.
  return result.context.assessment;
}
