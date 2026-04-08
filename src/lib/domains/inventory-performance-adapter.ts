import { DeterministicInsightAdapter } from "@/lib/domains/deterministic-insights";
import {
  InventoryPerformanceAssessment,
  InventoryPerformanceMetrics,
  InventoryRecordItem,
} from "@/lib/inventory/types";

type InventoryPerformanceInsightInput = {
  records: InventoryRecordItem[];
};

function roundTo(value: number, decimals: number) {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

function rate(numerator: number, denominator: number) {
  if (denominator <= 0) return null;
  return numerator / denominator;
}

function buildMetrics(records: InventoryRecordItem[]): InventoryPerformanceMetrics {
  const totals = records.reduce(
    (acc, row) => ({
      unitsIn: acc.unitsIn + row.units_in,
      unitsOut: acc.unitsOut + row.units_out,
      wasteUnits: acc.wasteUnits + row.waste_units,
      revenue: acc.revenue + (row.revenue ?? 0),
    }),
    {
      unitsIn: 0,
      unitsOut: 0,
      wasteUnits: 0,
      revenue: 0,
    },
  );

  const latest = records
    .slice()
    .sort((a, b) => {
      const byDate = b.record_date.getTime() - a.record_date.getTime();
      if (byDate !== 0) return byDate;
      return b.updated_at.getTime() - a.updated_at.getTime();
    })[0];

  const sellThroughRate = rate(totals.unitsOut, totals.unitsIn);
  const wasteRate = rate(totals.wasteUnits, totals.unitsIn);
  const revenuePerUnitSold = rate(totals.revenue, totals.unitsOut);

  return {
    recordCount: records.length,
    totalUnitsIn: totals.unitsIn,
    totalUnitsOut: totals.unitsOut,
    totalWasteUnits: totals.wasteUnits,
    totalRevenue: roundTo(totals.revenue, 2),
    latestRemainingStock: latest ? latest.remaining_stock : null,
    sellThroughRate,
    wasteRate,
    revenuePerUnitSold,
    lowStockRecordCount: records.filter((row) => row.remaining_stock <= 10).length,
  };
}

function formatRate(value: number | null) {
  if (value === null) return "0.0%";
  return `${(value * 100).toFixed(1)}%`;
}

function buildInsights(metrics: InventoryPerformanceMetrics) {
  if (metrics.recordCount === 0) {
    return [
      {
        key: "insufficient_data",
        level: "neutral" as const,
        message: "No inventory records yet. Add records to generate deterministic insights.",
      },
    ];
  }

  const insights: InventoryPerformanceAssessment["insights"] = [];

  if (metrics.sellThroughRate !== null) {
    if (metrics.sellThroughRate >= 0.75) {
      insights.push({
        key: "sell_through_strong",
        level: "positive",
        message: `Sell-through is strong at ${formatRate(metrics.sellThroughRate)}.`,
      });
    } else if (metrics.sellThroughRate <= 0.4) {
      insights.push({
        key: "sell_through_weak",
        level: "warning",
        message: `Sell-through is weak at ${formatRate(metrics.sellThroughRate)}.`,
      });
    }
  }

  if (metrics.wasteRate !== null) {
    if (metrics.wasteRate >= 0.1) {
      insights.push({
        key: "waste_high",
        level: "warning",
        message: `Waste rate is high at ${formatRate(metrics.wasteRate)}.`,
      });
    } else if (metrics.wasteRate <= 0.03) {
      insights.push({
        key: "waste_low",
        level: "positive",
        message: `Waste rate is controlled at ${formatRate(metrics.wasteRate)}.`,
      });
    }
  }

  if (metrics.latestRemainingStock !== null) {
    if (metrics.latestRemainingStock <= 10) {
      insights.push({
        key: "restock_risk",
        level: "warning",
        message: "Remaining stock is low. Restock risk is elevated.",
      });
    } else if (metrics.latestRemainingStock >= 100) {
      insights.push({
        key: "stock_healthy",
        level: "positive",
        message: "Remaining stock snapshot is healthy.",
      });
    }
  }

  if (metrics.revenuePerUnitSold !== null) {
    insights.push({
      key: "revenue_per_unit",
      level: "neutral",
      message: `Revenue per unit sold is ${roundTo(metrics.revenuePerUnitSold, 2)}.`,
    });
  }

  if (insights.length === 0) {
    insights.push({
      key: "no_signal",
      level: "neutral",
      message: "No strong inventory signal detected yet.",
    });
  }

  return insights;
}

export const inventoryPerformanceInsightAdapter: DeterministicInsightAdapter<
  InventoryPerformanceInsightInput,
  InventoryPerformanceAssessment
> = {
  domain: "inventory_performance",
  computeDeterministicInsights: ({ records }) => {
    const metrics = buildMetrics(records);
    return {
      insufficientData: metrics.recordCount === 0,
      metrics,
      insights: buildInsights(metrics),
    };
  },
};
