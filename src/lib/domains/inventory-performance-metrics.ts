import { format } from "date-fns";
import { inventoryPerformanceInsightAdapter } from "@/lib/domains/inventory-performance-adapter";
import {
  InsightMetricItem,
  RankingMetricItem,
  StandardizedDomainMetricsContract,
} from "@/lib/domains/metrics-contract";
import {
  DailyProductReportItem,
  InventoryPerformanceAssessment,
  ProductItem,
} from "@/lib/inventory/types";

// Phase 2B foundational adapter:
// this file remains the canonical standardized implementation for inventory_performance.
//
// Canonical runtime inventory reporting source:
// - DailyProductReport (finalized records)
//
// Deprecated legacy source intentionally excluded:
// - InventoryRecord

type InventoryTotalKey =
  | "product_count"
  | "report_count"
  | "units_sold"
  | "recipe_batches_sold"
  | "revenue"
  | "cogs"
  | "gross_profit"
  | "low_stock_count"
  | "high_waste_count";

type InventoryRatioKey =
  | "gross_margin_rate"
  | "sell_through_rate"
  | "waste_rate";

type InventoryTrendKey =
  | "daily_revenue"
  | "daily_units_sold"
  | "daily_gross_profit";

type InventoryRankingKey =
  | "top_selling_products"
  | "top_gross_profit_products"
  | "low_stock_products"
  | "high_waste_products";

export type InventoryPerformanceDomainMetrics = StandardizedDomainMetricsContract<
  "inventory_performance",
  InventoryTotalKey,
  InventoryRatioKey,
  InventoryTrendKey,
  InventoryRankingKey
>;

export type InventoryPerformanceMetricsInput = {
  products: ProductItem[];
  reports: DailyProductReportItem[];
  now?: Date;
};

export type InventoryPerformanceMetricsResult = {
  metrics: InventoryPerformanceDomainMetrics;
  context: {
    assessment: InventoryPerformanceAssessment;
    finalizedReports: DailyProductReportItem[];
  };
};

function toInsightItems(insights: InventoryPerformanceAssessment["insights"]) {
  return insights.map(
    (insight) =>
      ({
        key: insight.key,
        level: insight.level,
        message: insight.message,
      }) satisfies InsightMetricItem,
  );
}

function sortDateAsc(a: string, b: string) {
  if (a < b) return -1;
  if (a > b) return 1;
  return 0;
}

function toDayDate(dateKey: string) {
  return new Date(`${dateKey}T00:00:00.000Z`);
}

function aggregateFinalizedByDay(reports: DailyProductReportItem[]) {
  const byDay = reports.reduce(
    (acc, row) => {
      const dateKey = row.report_date.toISOString().slice(0, 10);
      const current = acc.get(dateKey) ?? {
        revenue: 0,
        unitsSold: 0,
        grossProfit: 0,
      };
      current.revenue += row.revenue;
      current.unitsSold += row.units_sold;
      current.grossProfit += row.gross_profit;
      acc.set(dateKey, current);
      return acc;
    },
    new Map<string, { revenue: number; unitsSold: number; grossProfit: number }>(),
  );

  return Array.from(byDay.entries())
    .sort(([a], [b]) => sortDateAsc(a, b))
    .map(([dateKey, value]) => ({
      dateKey,
      date: toDayDate(dateKey),
      label: format(toDayDate(dateKey), "MMM d"),
      revenue: value.revenue,
      unitsSold: value.unitsSold,
      grossProfit: value.grossProfit,
    }));
}

function toRanking(
  rows: Array<{
    id: string;
    label: string;
    value: number;
    meta?: RankingMetricItem["meta"];
  }>,
) {
  return rows.map(
    (row) =>
      ({
        id: row.id,
        label: row.label,
        value: row.value,
        meta: row.meta,
      }) satisfies RankingMetricItem,
  );
}

function toPeriod(reports: DailyProductReportItem[]) {
  if (reports.length === 0) return null;
  let min = reports[0].report_date;
  let max = reports[0].report_date;
  reports.forEach((report) => {
    if (report.report_date < min) min = report.report_date;
    if (report.report_date > max) max = report.report_date;
  });

  return {
    from: min,
    to: max,
    label: `${format(min, "yyyy-MM-dd")} to ${format(max, "yyyy-MM-dd")}`,
  };
}

export function buildInventoryPerformanceDomainMetrics(
  input: InventoryPerformanceMetricsInput,
): InventoryPerformanceMetricsResult {
  const now = input.now ?? new Date();
  const assessment = inventoryPerformanceInsightAdapter.computeDeterministicInsights({
    products: input.products,
    reports: input.reports,
  });
  const finalizedReports = input.reports.filter((report) => report.is_finalized);
  const byDay = aggregateFinalizedByDay(finalizedReports);

  const totalAvailableStock = finalizedReports.reduce(
    (sum, row) => sum + row.beginning_stock + row.stock_added,
    0,
  );
  const totalWasteUnits = finalizedReports.reduce((sum, row) => sum + row.waste_units, 0);
  const wasteRate = totalAvailableStock > 0 ? totalWasteUnits / totalAvailableStock : null;
  const period = toPeriod(finalizedReports);
  const metrics = assessment.metrics;

  return {
    metrics: {
      totals: {
        product_count: {
          key: "product_count",
          label: "Products",
          value: input.products.length,
          unit: "count",
        },
        report_count: {
          key: "report_count",
          label: "Closed Reports",
          value: metrics.reportCount,
          unit: "count",
        },
        units_sold: {
          key: "units_sold",
          label: "Units Sold",
          value: metrics.totalUnitsSold,
          unit: "count",
        },
        recipe_batches_sold: {
          key: "recipe_batches_sold",
          label: "Recipe Batches Sold",
          value: metrics.totalRecipeBatchesSold,
          unit: "ratio",
        },
        revenue: {
          key: "revenue",
          label: "Revenue",
          value: metrics.totalRevenue,
          unit: "currency",
        },
        cogs: {
          key: "cogs",
          label: "COGS",
          value: metrics.totalCogs,
          unit: "currency",
        },
        gross_profit: {
          key: "gross_profit",
          label: "Gross Profit",
          value: metrics.totalGrossProfit,
          unit: "currency",
        },
        low_stock_count: {
          key: "low_stock_count",
          label: "Low Stock Products",
          value: metrics.lowStockProductCount,
          unit: "count",
        },
        high_waste_count: {
          key: "high_waste_count",
          label: "High Waste Products",
          value: metrics.highWasteProductCount,
          unit: "count",
        },
      },
      ratios: {
        gross_margin_rate: {
          key: "gross_margin_rate",
          label: "Gross Margin",
          value: metrics.grossMarginRate ?? 0,
          numerator: metrics.totalGrossProfit,
          denominator: metrics.totalRevenue,
          unit: "percentage",
        },
        sell_through_rate: {
          key: "sell_through_rate",
          label: "Sell-through Rate",
          value: metrics.averageSellThroughRate ?? 0,
          numerator: metrics.totalUnitsSold,
          denominator: totalAvailableStock,
          unit: "percentage",
        },
        waste_rate: {
          key: "waste_rate",
          label: "Waste Rate",
          value: wasteRate ?? 0,
          numerator: totalWasteUnits,
          denominator: totalAvailableStock,
          unit: "percentage",
        },
      },
      trends: {
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
        daily_units_sold: {
          key: "daily_units_sold",
          label: "Daily Units Sold",
          granularity: "day",
          points: byDay.map((row) => ({
            label: row.label,
            value: row.unitsSold,
            date: row.date,
          })),
        },
        daily_gross_profit: {
          key: "daily_gross_profit",
          label: "Daily Gross Profit",
          granularity: "day",
          points: byDay.map((row) => ({
            label: row.label,
            value: row.grossProfit,
            date: row.date,
          })),
        },
      },
      rankings: {
        top_selling_products: toRanking(
          metrics.topSellingProducts.map((row) => ({
            id: row.productId,
            label: row.productName,
            value: row.value,
          })),
        ),
        top_gross_profit_products: toRanking(
          metrics.topGrossProfitProducts.map((row) => ({
            id: row.productId,
            label: row.productName,
            value: row.value,
          })),
        ),
        low_stock_products: toRanking(
          metrics.lowStockProducts.map((row) => ({
            id: row.productId,
            label: row.productName,
            value: row.endingStock,
            meta: {
              reportDate: row.reportDate.toISOString().slice(0, 10),
            },
          })),
        ),
        high_waste_products: toRanking(
          metrics.highWasteProducts.map((row) => ({
            id: row.productId,
            label: row.productName,
            value: row.wasteUnits,
          })),
        ),
      },
      insights: toInsightItems(assessment.insights),
      metadata: {
        domain: "inventory_performance",
        generatedAt: now,
        period,
        source: {
          mode: "deterministic",
          systems: ["daily_product_report"],
          notes: [
            "DailyProductReport is the canonical runtime inventory reporting source.",
            "InventoryRecord remains deprecated and excluded from standardized runtime metrics.",
          ],
        },
        flags: {
          hasFinalizedReports: finalizedReports.length > 0,
          hasProducts: input.products.length > 0,
        },
      },
    },
    context: {
      assessment,
      finalizedReports,
    },
  };
}

export function getInventoryPerformanceMetrics(
  input: InventoryPerformanceMetricsInput,
) {
  return buildInventoryPerformanceDomainMetrics(input);
}

export function mapInventoryPerformanceMetricsToLegacyAssessment(
  result: InventoryPerformanceMetricsResult,
): InventoryPerformanceAssessment {
  // Compatibility wrapper for current inventory page/report consumers.
  return result.context.assessment;
}
