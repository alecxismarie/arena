import { DeterministicInsightAdapter } from "@/lib/domains/deterministic-insights";
import {
  AssetRecordItem,
  AssetUtilizationAssessment,
  AssetUtilizationMetrics,
} from "@/lib/asset/types";

type AssetUtilizationInsightInput = {
  records: AssetRecordItem[];
};

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function rate(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

function formatRate(value: number | null) {
  if (value === null) return "0.0%";
  return `${(value * 100).toFixed(1)}%`;
}

function buildMetrics(records: AssetRecordItem[]): AssetUtilizationMetrics {
  const totals = records.reduce(
    (acc, row) => ({
      totalAssets: acc.totalAssets + row.total_assets,
      bookedAssets: acc.bookedAssets + row.booked_assets,
      idleAssets: acc.idleAssets + row.idle_assets,
      revenue: acc.revenue + (row.revenue ?? 0),
    }),
    {
      totalAssets: 0,
      bookedAssets: 0,
      idleAssets: 0,
      revenue: 0,
    },
  );

  const utilizationRate = rate(totals.bookedAssets, totals.totalAssets);
  const idleRate = rate(totals.idleAssets, totals.totalAssets);
  const revenuePerAsset = rate(totals.revenue, totals.totalAssets);

  const lowUtilizationFlag = utilizationRate !== null && utilizationRate < 0.4;
  const highUtilizationFlag = utilizationRate !== null && utilizationRate > 0.8;

  return {
    recordCount: records.length,
    totalAssets: totals.totalAssets,
    totalBookedAssets: totals.bookedAssets,
    totalIdleAssets: totals.idleAssets,
    totalRevenue: roundTo(totals.revenue, 2),
    utilizationRate,
    idleRate,
    revenuePerAsset,
    lowUtilizationFlag,
    highUtilizationFlag,
  };
}

function buildInsights(metrics: AssetUtilizationMetrics) {
  if (metrics.recordCount === 0 || metrics.totalAssets <= 0) {
    return [
      {
        key: "insufficient_data",
        level: "neutral" as const,
        message: "No asset records yet. Add records to generate deterministic insights.",
      },
    ];
  }

  const insights: AssetUtilizationAssessment["insights"] = [];

  if (metrics.highUtilizationFlag) {
    insights.push({
      key: "high_utilization",
      level: "positive",
      message: "High utilization — assets are being efficiently used.",
    });
  } else if (metrics.lowUtilizationFlag) {
    insights.push({
      key: "low_utilization",
      level: "warning",
      message: "Low utilization — assets may be underused.",
    });
  }

  if (metrics.idleRate !== null && metrics.idleRate >= 0.5) {
    insights.push({
      key: "high_idle_rate",
      level: "warning",
      message: `High idle rate (${formatRate(metrics.idleRate)}) — capacity is not being utilized.`,
    });
  }

  if (
    !metrics.lowUtilizationFlag &&
    !metrics.highUtilizationFlag &&
    metrics.idleRate !== null &&
    metrics.idleRate < 0.5
  ) {
    insights.push({
      key: "healthy_balance",
      level: "positive",
      message: "Healthy utilization balance.",
    });
  }

  if (metrics.revenuePerAsset !== null) {
    insights.push({
      key: "revenue_per_asset",
      level: "neutral",
      message: `Revenue per asset is ${roundTo(metrics.revenuePerAsset, 2)}.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      key: "no_signal",
      level: "neutral",
      message: "No strong utilization signal detected yet.",
    });
  }

  return insights;
}

export const assetUtilizationInsightAdapter: DeterministicInsightAdapter<
  AssetUtilizationInsightInput,
  AssetUtilizationAssessment
> = {
  domain: "asset_utilization",
  computeDeterministicInsights: ({ records }) => {
    const metrics = buildMetrics(records);
    return {
      insufficientData: metrics.recordCount === 0 || metrics.totalAssets <= 0,
      metrics,
      insights: buildInsights(metrics),
    };
  },
};
